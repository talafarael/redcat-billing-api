import {
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import type { Response } from 'express';
import { Role } from '@/users/enums/role.enum';
import { User } from '@/users/entities/user.entity';
import { UsersService } from '@/users/users.service';
import { AuthCookieService } from './auth-cookie.service';
import { AuthService } from './auth.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn((value: string) => Promise.resolve(`hashed_${value}`)),
  compare: jest.fn(),
}));

import * as bcrypt from 'bcrypt';

const mockedCompare = bcrypt.compare as jest.MockedFunction<typeof bcrypt.compare>;

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<
    Pick<
      UsersService,
      'create' | 'updateRefreshToken' | 'findById' | 'findByEmail'
    >
  >;
  let jwtService: { signAsync: jest.Mock };
  let configService: { get: jest.Mock };
  let authCookieService: { setTokens: jest.Mock; clearTokens: jest.Mock };

  const baseUser = (): User =>
    ({
      id: '11111111-1111-1111-1111-111111111111',
      email: 'user@example.com',
      password: 'stored-hash',
      refreshToken: 'hashed-refresh',
      role: Role.CLIENT,
      balance: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }) as User;

  beforeEach(async () => {
    mockedCompare.mockReset();

    usersService = {
      create: jest.fn(),
      updateRefreshToken: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn(),
      findByEmail: jest.fn(),
    };

    jwtService = {
      signAsync: jest
        .fn()
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token'),
    };

    configService = {
      get: jest.fn((key: string, defaultValue?: string) => {
        const map: Record<string, string> = {
          'jwt.accessSecret': 'access-secret',
          'jwt.refreshSecret': 'refresh-secret',
          'jwt.accessExpiresIn': '15m',
          'jwt.refreshExpiresIn': '7d',
        };
        return map[key] ?? defaultValue;
      }),
    };

    authCookieService = {
      setTokens: jest.fn(),
      clearTokens: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: AuthCookieService, useValue: authCookieService },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  const resetJwtMocksForGenerateTokens = () => {
    jwtService.signAsync.mockReset();
    jwtService.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');
  };

  describe('register', () => {
    it('creates user, issues tokens, persists refresh hash, sets cookies', async () => {
      resetJwtMocksForGenerateTokens();
      const created = baseUser();
      usersService.create.mockResolvedValue(created);
      const res = {} as Response;
      const dto = { email: 'new@example.com', password: 'secret1234' };

      await service.register(dto, res);

      expect(usersService.create).toHaveBeenCalledWith(
        'new@example.com',
        'secret1234',
      );
      expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
      expect(usersService.updateRefreshToken).toHaveBeenCalledWith(
        created.id,
        'refresh-token',
      );
      expect(authCookieService.setTokens).toHaveBeenCalledWith(res, {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
    });
  });

  describe('login', () => {
    it('issues tokens, persists refresh hash, sets cookies', async () => {
      resetJwtMocksForGenerateTokens();
      const user = baseUser();
      const res = {} as Response;

      await service.login(user, res);

      expect(usersService.create).not.toHaveBeenCalled();
      expect(usersService.updateRefreshToken).toHaveBeenCalledWith(
        user.id,
        'refresh-token',
      );
      expect(authCookieService.setTokens).toHaveBeenCalledWith(res, {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
    });
  });

  describe('logout', () => {
    it('clears refresh token and cookies', async () => {
      const res = {} as Response;
      await service.logout(baseUser().id, res);

      expect(usersService.updateRefreshToken).toHaveBeenCalledWith(
        baseUser().id,
        null,
      );
      expect(authCookieService.clearTokens).toHaveBeenCalledWith(res);
    });
  });

  describe('refreshTokens', () => {
    it('throws ForbiddenException when user is missing', async () => {
      usersService.findById.mockResolvedValue(null);
      const res = {} as Response;

      await expect(
        service.refreshTokens('uid', 'raw-refresh', res),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(jwtService.signAsync).not.toHaveBeenCalled();
      expect(authCookieService.setTokens).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when refresh token is not stored', async () => {
      const user = baseUser();
      user.refreshToken = null as unknown as string;
      usersService.findById.mockResolvedValue(user);

      await expect(
        service.refreshTokens(user.id, 'raw', {} as Response),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws ForbiddenException when account is deactivated', async () => {
      const user = baseUser();
      user.isActive = false;
      usersService.findById.mockResolvedValue(user);

      await expect(
        service.refreshTokens(user.id, 'raw', {} as Response),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws ForbiddenException when refresh token does not match', async () => {
      const user = baseUser();
      usersService.findById.mockResolvedValue(user);
      mockedCompare.mockResolvedValue(false as never);

      await expect(
        service.refreshTokens(user.id, 'wrong', {} as Response),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(mockedCompare).toHaveBeenCalledWith('wrong', user.refreshToken);
    });

    it('rotates tokens and sets cookies when refresh is valid', async () => {
      resetJwtMocksForGenerateTokens();
      const user = baseUser();
      usersService.findById.mockResolvedValue(user);
      mockedCompare.mockResolvedValue(true as never);
      const res = {} as Response;

      await service.refreshTokens(user.id, 'raw-refresh', res);

      expect(mockedCompare).toHaveBeenCalledWith('raw-refresh', user.refreshToken);
      expect(usersService.updateRefreshToken).toHaveBeenCalledWith(
        user.id,
        'refresh-token',
      );
      expect(authCookieService.setTokens).toHaveBeenCalledWith(res, {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
    });
  });

  describe('validateUser', () => {
    it('throws UnauthorizedException when email is unknown', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.validateUser('missing@example.com', 'pw'),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(mockedCompare).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when account is deactivated', async () => {
      const user = baseUser();
      user.isActive = false;
      usersService.findByEmail.mockResolvedValue(user);

      await expect(
        service.validateUser(user.email, 'pw'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws UnauthorizedException when password is wrong', async () => {
      const user = baseUser();
      usersService.findByEmail.mockResolvedValue(user);
      mockedCompare.mockResolvedValue(false as never);

      await expect(
        service.validateUser(user.email, 'wrong'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('returns user when credentials are valid', async () => {
      const user = baseUser();
      usersService.findByEmail.mockResolvedValue(user);
      mockedCompare.mockResolvedValue(true as never);

      await expect(
        service.validateUser(user.email, 'correct'),
      ).resolves.toBe(user);

      expect(mockedCompare).toHaveBeenCalledWith('correct', user.password);
    });
  });
});
