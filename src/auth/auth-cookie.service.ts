import { Injectable } from '@nestjs/common';
import type { CookieOptions, Response } from 'express';
import { TokensDto } from './dto/response/tokens.dto';
import { COOKIE } from 'src/config/cookies';

@Injectable()
export class AuthCookieService {
  private get baseOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    };
  }

  setTokens(res: Response, tokens: TokensDto): void {
    res.cookie(COOKIE.ACCESS, tokens.accessToken, {
      ...this.baseOptions,
      maxAge: COOKIE.ACCESS_TTL_MS,
    });
    res.cookie(COOKIE.REFRESH, tokens.refreshToken, {
      ...this.baseOptions,
      maxAge: COOKIE.REFRESH_TTL_MS,
      path: COOKIE.REFRESH_PATH,
    });
  }

  clearTokens(res: Response): void {
    res.clearCookie(COOKIE.ACCESS);
    res.clearCookie(COOKIE.REFRESH, { path: COOKIE.REFRESH_PATH });
  }
}
