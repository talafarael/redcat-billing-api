import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import type { Response } from 'express';
import { COOKIE } from '@/common/config/cookies';
import { AuthCookieService } from './auth-cookie.service';
import { TokensDto } from './dto/response/tokens.dto';

describe('AuthCookieService', () => {
  let service: AuthCookieService;
  let configGet: jest.Mock;
  let res: { cookie: jest.Mock; clearCookie: jest.Mock };

  const tokens = (): TokensDto => ({
    accessToken: 'access-jwt',
    refreshToken: 'refresh-jwt',
  });

  async function createService(nodeEnv: string) {
    configGet = jest.fn((key: string) => {
      if (key === 'nodeEnv') return nodeEnv;
      return undefined;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthCookieService,
        { provide: ConfigService, useValue: { get: configGet } },
      ],
    }).compile();

    service = module.get(AuthCookieService);
    res = { cookie: jest.fn(), clearCookie: jest.fn() };
  }

  describe('setTokens', () => {
    it('sets access and refresh cookies with shared options; secure is false when not production', async () => {
      await createService('development');

      service.setTokens(res as unknown as Response, tokens());

      expect(res.cookie).toHaveBeenCalledTimes(2);

      expect(res.cookie).toHaveBeenNthCalledWith(
        1,
        COOKIE.ACCESS,
        'access-jwt',
        expect.objectContaining({
          httpOnly: true,
          secure: false,
          sameSite: 'strict',
          maxAge: COOKIE.ACCESS_TTL_MS,
        }),
      );

      expect(res.cookie).toHaveBeenNthCalledWith(
        2,
        COOKIE.REFRESH,
        'refresh-jwt',
        expect.objectContaining({
          httpOnly: true,
          secure: false,
          sameSite: 'strict',
          maxAge: COOKIE.REFRESH_TTL_MS,
          path: COOKIE.REFRESH_PATH,
        }),
      );
    });

    it('sets secure cookie flag in production', async () => {
      await createService('production');

      service.setTokens(res as unknown as Response, tokens());

      expect(res.cookie).toHaveBeenNthCalledWith(
        1,
        COOKIE.ACCESS,
        'access-jwt',
        expect.objectContaining({ secure: true }),
      );
      expect(res.cookie).toHaveBeenNthCalledWith(
        2,
        COOKIE.REFRESH,
        'refresh-jwt',
        expect.objectContaining({ secure: true }),
      );
    });
  });

  describe('clearTokens', () => {
    it('clears access and refresh cookies; refresh uses refresh path', async () => {
      await createService('development');

      service.clearTokens(res as unknown as Response);

      expect(res.clearCookie).toHaveBeenCalledTimes(2);
      expect(res.clearCookie).toHaveBeenNthCalledWith(1, COOKIE.ACCESS);
      expect(res.clearCookie).toHaveBeenNthCalledWith(2, COOKIE.REFRESH, {
        path: COOKIE.REFRESH_PATH,
      });
    });
  });
});
