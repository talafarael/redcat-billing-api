import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { Strategy } from 'passport-jwt';
import { JwtPayload } from '@/auth/interfaces/jwt-payload.interface';
import { COOKIE } from '@/common/config/cookies';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: (req: Request): string | null => {
        const cookies = req?.cookies as Record<string, string> | undefined;
        return cookies?.[COOKIE.REFRESH] ?? null;
      },
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.refreshSecret')!,
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: JwtPayload) {
    const refreshToken = req.cookies?.[COOKIE.REFRESH] as string;
    return { id: payload.sub, email: payload.email, refreshToken };
  }
}
