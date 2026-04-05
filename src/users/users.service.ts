import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { EntityManager } from 'typeorm';
import { UserProfileResponseDto } from './dto/response/user-profile.dto';
import { User } from './entities/user.entity';
import { UserRepository } from './repositories/user.repository';
import { AuthCookieService } from '@/auth/auth-cookie.service';
import { buildPaginatedResponse } from '@/common/utils/paginated-response';
import { Response } from 'express';
import { PaginatedUsersResponseDto } from './dto/response/paginated-users.dto';
import { PaginationQueryDto } from '@/common/dto/request/pagination-query.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly authCookieService: AuthCookieService,
  ) { }

  findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email);
  }

  findById(id: string): Promise<User | null> {
    return this.userRepository.findById(id);
  }

  async findByIdOrFail(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) throw new NotFoundException('User not found');
    if (!user.isActive) throw new ForbiddenException('Account is deactivated');
    return user;
  }

  async adjustBalance(
    userId: string,
    delta: number,
    manager?: EntityManager,
  ): Promise<void> {
    const repo = manager ? manager.getRepository(User) : this.userRepository;
    await repo.increment({ id: userId }, 'balance', delta);
  }

  async debitBalanceIfSufficient(
    userId: string,
    amount: number,
    manager?: EntityManager,
  ): Promise<void> {
    const affected = await this.userRepository.debitBalanceAtomic(
      userId,
      amount,
      manager,
    );
    if (affected === 0) {
      await this.findByIdOrFail(userId);
      throw new BadRequestException('Insufficient funds');
    }
  }

  async create(email: string, password: string): Promise<User> {
    const existing = await this.userRepository.findByEmail(email);
    if (existing) {
      throw new ConflictException('User with this email already exists');
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = this.userRepository.create({
      email,
      password: hashedPassword,
    });
    return this.userRepository.save(user);
  }

  async getProfile(id: string): Promise<UserProfileResponseDto> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async getUser(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (!user.isActive) {
      throw new ForbiddenException('Recipient account is deactivated');
    }
    return user;
  }

  async getUsers(
    query: PaginationQueryDto,
  ): Promise<PaginatedUsersResponseDto> {
    const [data, total] = await this.userRepository.findAll(query);
    return buildPaginatedResponse<User>(data, total, query);
  }

  async blockUser(targetId: string): Promise<void> {
    const user = await this.userRepository.findById(targetId);
    if (!user) throw new NotFoundException('User not found');
    if (!user.isActive) throw new ConflictException('User is already blocked');

    await this.userRepository.update(targetId, {
      isActive: false,
      refreshToken: null,
    });
  }

  async deactivate(userId: string, res: Response): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    await this.userRepository.update(userId, {
      isActive: false,
      refreshToken: null,
    });
    this.authCookieService.clearTokens(res);
  }

  async updateRefreshToken(
    userId: string,
    refreshToken: string | null,
  ): Promise<void> {
    const hashed = refreshToken ? await bcrypt.hash(refreshToken, 10) : null;
    await this.userRepository.update(userId, { refreshToken: hashed });
  }
}
