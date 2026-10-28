import type { CookieOptions, Response } from "express";

export const ACCESS_COOKIE = "jobify_access";
export const REFRESH_COOKIE = "jobify_refresh";

/**
 * The web app proxies /api to this server, so cookies are first-party on the
 * web origin and SameSite=Lax is enough. The refresh cookie is only sent to
 * the auth endpoints.
 */
function baseOptions(secure: boolean): CookieOptions {
  return { httpOnly: true, sameSite: "lax", secure };
}

export function setAuthCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken: string },
  opts: { secure: boolean; accessTtlSeconds: number; refreshTtlDays: number },
): void {
  res.cookie(ACCESS_COOKIE, tokens.accessToken, {
    ...baseOptions(opts.secure),
    path: "/",
    maxAge: opts.accessTtlSeconds * 1000,
  });
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
    ...baseOptions(opts.secure),
    path: "/api/auth",
    maxAge: opts.refreshTtlDays * 86_400_000,
  });
}

export function clearAuthCookies(res: Response, secure: boolean): void {
  res.clearCookie(ACCESS_COOKIE, { ...baseOptions(secure), path: "/" });
  res.clearCookie(REFRESH_COOKIE, { ...baseOptions(secure), path: "/api/auth" });
}
