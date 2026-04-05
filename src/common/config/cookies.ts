export const COOKIE = {
  ACCESS: 'access_token',
  REFRESH: 'refresh_token',
  REFRESH_PATH: '/api/auth/refresh',
  ACCESS_TTL_MS: 15 * 60 * 1000,
  REFRESH_TTL_MS: 7 * 24 * 60 * 60 * 1000,
} as const;
