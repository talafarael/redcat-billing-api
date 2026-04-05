import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserProfileResponseDto } from './dto/response/user-profile.dto';
import { User } from './entities/user.entity';
import { UserRepository } from './repositories/user.repository';
import { AuthCookieService } from 'src/auth/auth-cookie.service';
import { Response } from 'express';
import { PaginatedUsersResponseDto } from './dto/response/paginated-users.dto';
import { PaginationQueryDto } from 'src/common/dto/request/pagination-query.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly authCookieService: AuthCookieService,
  ) {}

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

  async adjustBalance(userId: string, delta: number): Promise<void> {
    await this.userRepository.increment({ id: userId }, 'balance', delta);
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
    return {
      data,
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
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
