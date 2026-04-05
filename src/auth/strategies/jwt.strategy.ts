import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { Strategy } from 'passport-jwt';
import { JwtPayload } from '@/auth/interfaces/jwt-payload.interface';
import { UsersService } from '@/users/users.service';
import { User } from '@/users/entities/user.entity';
import { COOKIE } from '@/common/config/cookies';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UsersService,
  ) {
    super({
      jwtFromRequest: (req: Request): string | null => {
        const cookies = req?.cookies as Record<string, string> | undefined;
        return cookies?.[COOKIE.ACCESS] ?? null;
      },
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.accessSecret')!,
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    const user = await this.userService.findByEmail(payload.email);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }
    return user;
  }
}
