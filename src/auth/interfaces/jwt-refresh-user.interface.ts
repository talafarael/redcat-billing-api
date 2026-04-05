import type { Request } from 'express';

export interface JwtRefreshUser {
  id: string;
  email: string;
  refreshToken: string;
}

export type JwtRefreshRequest = Request & { user: JwtRefreshUser };
