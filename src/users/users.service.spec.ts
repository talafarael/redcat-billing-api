import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Response } from 'express';
import { EntityManager } from 'typeorm';
import { AuthCookieService } from '@/auth/auth-cookie.service';
import { PaginationQueryDto } from '@/common/pagination/dto/request/pagination-query.dto';
import { User } from './entities/user.entity';
import { Role } from './enums/role.enum';
import { UserRepository } from './repositories/user.repository';
import { UsersService } from './users.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn((value: string) =>
    Promise.resolve(`hashed_${value}`),
  ),
}));

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: jest.Mocked<
    Pick<
      UserRepository,
      | 'findByEmail'
      | 'findById'
      | 'create'
      | 'save'
      | 'findAll'
      | 'update'
      | 'increment'
      | 'debitBalanceAtomic'
    >
  >;
  let authCookieService: { clearTokens: jest.Mock };

  const baseUser = (): User =>
    ({
      id: '11111111-1111-1111-1111-111111111111',
      email: 'user@example.com',
      password: 'stored-hash',
      refreshToken: null,
      role: Role.CLIENT,
      balance: 100,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }) as User;

  beforeEach(async () => {
    userRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      increment: jest.fn().mockResolvedValue(undefined),
      debitBalanceAtomic: jest.fn(),
    };
    authCookieService = { clearTokens: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UserRepository, useValue: userRepository },
        { provide: AuthCookieService, useValue: authCookieService },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  describe('findByEmail / findById', () => {
    it('findByEmail delegates to repository', async () => {
      const user = baseUser();
      userRepository.findByEmail.mockResolvedValue(user);
      await expect(service.findByEmail('user@example.com')).resolves.toBe(
        user,
      );
      expect(userRepository.findByEmail).toHaveBeenCalledWith('user@example.com');
    });

    it('findById delegates to repository', async () => {
      const user = baseUser();
      userRepository.findById.mockResolvedValue(user);
      await expect(service.findById(user.id)).resolves.toBe(user);
      expect(userRepository.findById).toHaveBeenCalledWith(user.id);
    });
  });

  describe('findByIdOrFail', () => {
    it('throws NotFoundException when user is missing', async () => {
      userRepository.findById.mockResolvedValue(null);
      await expect(
        service.findByIdOrFail('missing-id'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ForbiddenException when user is deactivated', async () => {
      const user = baseUser();
      user.isActive = false;
      userRepository.findById.mockResolvedValue(user);
      await expect(service.findByIdOrFail(user.id)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('returns active user', async () => {
      const user = baseUser();
      userRepository.findById.mockResolvedValue(user);
      await expect(service.findByIdOrFail(user.id)).resolves.toBe(user);
    });
  });

  describe('adjustBalance', () => {
    it('increments balance via repository when no transaction manager', async () => {
      await service.adjustBalance('uid', 10);
      expect(userRepository.increment).toHaveBeenCalledWith(
        { id: 'uid' },
        'balance',
        10,
      );
    });

    it('increments balance via EntityManager repository when manager is passed', async () => {
      const increment = jest.fn().mockResolvedValue(undefined);
      const manager = {
        getRepository: jest.fn().mockReturnValue({ increment }),
      } as unknown as EntityManager;

      await service.adjustBalance('uid', -5, manager);

      expect(manager.getRepository).toHaveBeenCalledWith(User);
      expect(increment).toHaveBeenCalledWith({ id: 'uid' }, 'balance', -5);
    });
  });

  describe('debitBalanceIfSufficient', () => {
    it('does nothing extra when atomic debit affects a row', async () => {
      userRepository.debitBalanceAtomic.mockResolvedValue(1);
      await expect(
        service.debitBalanceIfSufficient('uid', 50),
      ).resolves.toBeUndefined();
      expect(userRepository.findById).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when debit fails and user does not exist', async () => {
      userRepository.debitBalanceAtomic.mockResolvedValue(0);
      userRepository.findById.mockResolvedValue(null);
      await expect(
        service.debitBalanceIfSufficient('uid', 50),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ForbiddenException when debit fails and account is deactivated', async () => {
      userRepository.debitBalanceAtomic.mockResolvedValue(0);
      const user = baseUser();
      user.isActive = false;
      userRepository.findById.mockResolvedValue(user);
      await expect(
        service.debitBalanceIfSufficient(user.id, 50),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws BadRequestException when user exists but funds are insufficient', async () => {
      userRepository.debitBalanceAtomic.mockResolvedValue(0);
      userRepository.findById.mockResolvedValue(baseUser());
      await expect(
        service.debitBalanceIfSufficient('uid', 999),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('create', () => {
    it('throws ConflictException when email is already registered', async () => {
      userRepository.findByEmail.mockResolvedValue(baseUser());
      await expect(service.create('a@b.com', 'secret')).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(userRepository.create).not.toHaveBeenCalled();
    });

    it('hashes password, saves and returns user', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      const created = { ...baseUser(), email: 'new@example.com' };
      const saved = { ...created, id: 'new-id' };
      userRepository.create.mockReturnValue(created as User);
      userRepository.save.mockResolvedValue(saved);

      await expect(
        service.create('new@example.com', 'plain'),
      ).resolves.toBe(saved);

      expect(userRepository.create).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'hashed_plain',
      });
      expect(userRepository.save).toHaveBeenCalledWith(created);
    });
  });

  describe('getUsers', () => {
    it('returns paginated payload from repository data', async () => {
      const users = [baseUser()];
      userRepository.findAll.mockResolvedValue([users, 42]);
      const query: PaginationQueryDto = { page: 2, limit: 10 };

      await expect(service.getUsers(query)).resolves.toEqual({
        data: users,
        total: 42,
        page: 2,
        limit: 10,
        totalPages: 5,
      });
      expect(userRepository.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('blockUser', () => {
    it('throws NotFoundException when user is missing', async () => {
      userRepository.findById.mockResolvedValue(null);
      await expect(service.blockUser('id')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(userRepository.update).not.toHaveBeenCalled();
    });

    it('throws ConflictException when user is already blocked', async () => {
      const user = baseUser();
      user.isActive = false;
      userRepository.findById.mockResolvedValue(user);
      await expect(service.blockUser(user.id)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(userRepository.update).not.toHaveBeenCalled();
    });

    it('deactivates user and clears refresh token', async () => {
      const user = baseUser();
      user.refreshToken = 'old';
      userRepository.findById.mockResolvedValue(user);

      await service.blockUser(user.id);

      expect(userRepository.update).toHaveBeenCalledWith(user.id, {
        isActive: false,
        refreshToken: null,
      });
    });
  });

  describe('deactivate', () => {
    it('throws NotFoundException when user is missing', async () => {
      userRepository.findById.mockResolvedValue(null);
      const res = {} as Response;
      await expect(service.deactivate('id', res)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(authCookieService.clearTokens).not.toHaveBeenCalled();
    });

    it('deactivates user, clears refresh in DB and clears auth cookies', async () => {
      const user = baseUser();
      userRepository.findById.mockResolvedValue(user);
      const res = {} as Response;

      await service.deactivate(user.id, res);

      expect(userRepository.update).toHaveBeenCalledWith(user.id, {
        isActive: false,
        refreshToken: null,
      });
      expect(authCookieService.clearTokens).toHaveBeenCalledWith(res);
    });
  });

  describe('updateRefreshToken', () => {
    it('sets hashed refresh token when value is provided', async () => {
      await service.updateRefreshToken('uid', 'refresh-secret');
      expect(userRepository.update).toHaveBeenCalledWith('uid', {
        refreshToken: 'hashed_refresh-secret',
      });
    });

    it('sets refresh token to null when value is null', async () => {
      await service.updateRefreshToken('uid', null);
      expect(userRepository.update).toHaveBeenCalledWith('uid', {
        refreshToken: null,
      });
    });
  });
});
