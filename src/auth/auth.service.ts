import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { Response } from 'express';
import type { StringValue } from 'ms';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/request/register.dto';
import { TokensDto } from './dto/response/tokens.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { AuthCookieService } from './auth-cookie.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly authCookieService: AuthCookieService,
  ) { }

  async register(dto: RegisterDto, res: Response): Promise<void> {
    const user = await this.usersService.create(dto.email, dto.password);
    const tokens = await this.generateTokens(user.id, user.email);
    await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);
    this.authCookieService.setTokens(res, tokens);
  }

  async login(user: User, res: Response): Promise<void> {
    const tokens = await this.generateTokens(user.id, user.email);
    await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);
    this.authCookieService.setTokens(res, tokens);
  }

  async logout(userId: string, res: Response): Promise<void> {
    await this.usersService.updateRefreshToken(userId, null);
    this.authCookieService.clearTokens(res);
  }

  async refreshTokens(
    userId: string,
    refreshToken: string,
    res: Response,
  ): Promise<void> {
    const user = await this.usersService.findById(userId);
    if (!user?.refreshToken) {
      throw new ForbiddenException('Access denied');
    }
    if (!user.isActive) {
      throw new ForbiddenException('Account is deactivated');
    }

    const tokenMatches = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!tokenMatches) {
      throw new ForbiddenException('Access denied');
    }

    const tokens = await this.generateTokens(user.id, user.email);
    await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);
    this.authCookieService.setTokens(res, tokens);
  }

  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  private async generateTokens(
    userId: string,
    email: string,
  ): Promise<TokensDto> {
    const payload: JwtPayload = { sub: userId, email };

    const accessExpiresIn = this.configService.get<string>(
      'jwt.accessExpiresIn',
      '15m',
    ) as StringValue;
    const refreshExpiresIn = this.configService.get<string>(
      'jwt.refreshExpiresIn',
      '7d',
    ) as StringValue;

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.accessSecret'),
        expiresIn: accessExpiresIn,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
        expiresIn: refreshExpiresIn,
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
