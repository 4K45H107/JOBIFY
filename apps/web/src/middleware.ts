import { decodeJwt } from "jose";
import { type NextRequest, NextResponse } from "next/server";
import { UserRole } from "@jobify/shared";
import { decideRoute, PATHNAME_HEADER } from "@/lib/auth/routing";

const ACCESS_COOKIE = "jobify_access";
const REFRESH_COOKIE = "jobify_refresh";
const API_URL = process.env.API_URL ?? "http://localhost:4000";

/**
 * Role from the access token, for routing only. The API verifies the
 * signature on every request, so a forged token can't read or change data.
 */
function roleFrom(token: string | undefined): UserRole | null {
  if (!token) return null;
  try {
    const { role, exp } = decodeJwt(token);
    if (exp && exp * 1000 < Date.now()) return null;
    return UserRole.safeParse(role).data ?? null;
  } catch {
    return null;
  }
}

/** Exchanges the refresh cookie for new cookies. Returns the Set-Cookie lines, or null. */
async function refresh(
  refreshToken: string,
  forwardedFor: string | null,
): Promise<string[] | null> {
  try {
    const res = await fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      headers: {
        cookie: `${REFRESH_COOKIE}=${refreshToken}`,
        ...(forwardedFor && { "x-forwarded-for": forwardedFor }),
      },
      cache: "no-store",
    });
    return res.ok ? res.headers.getSetCookie() : null;
  } catch {
    return null;
  }
}

const valueOf = (setCookies: string[], name: string) =>
  setCookies
    .find((c) => c.startsWith(`${name}=`))
    ?.split(";")[0]
    ?.slice(name.length + 1);

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  let access = request.cookies.get(ACCESS_COOKIE)?.value;
  let role = roleFrom(access);
  let refreshed: string[] | null = null;

  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!role && refreshToken) {
    refreshed = await refresh(refreshToken, request.headers.get("x-forwarded-for"));
    access = refreshed ? valueOf(refreshed, ACCESS_COOKIE) : undefined;
    role = roleFrom(access);
  }

  const decision = decideRoute(pathname, search, role);
  let response: NextResponse;

  if (decision.type === "redirect") {
    response = NextResponse.redirect(new URL(decision.to, request.url));
  } else {
    const headers = new Headers(request.headers);
    // Layouts can't read the URL, so pass it along (e.g. for employer onboarding).
    headers.set(PATHNAME_HEADER, pathname);
    if (refreshed) {
      // Let this render see the new cookies too, not just the browser.
      request.cookies.set(ACCESS_COOKIE, access ?? "");
      // A refresh inside the API's grace window renews only the access token.
      const nextRefresh = valueOf(refreshed, REFRESH_COOKIE);
      if (nextRefresh) request.cookies.set(REFRESH_COOKIE, nextRefresh);
      headers.set("cookie", request.cookies.toString());
    }
    response = NextResponse.next({ request: { headers } });
  }

  if (refreshed) {
    for (const line of refreshed) response.headers.append("set-cookie", line);
  } else if (refreshToken && !role) {
    // The refresh token is dead; drop it so we don't retry on every request.
    response.cookies.delete(REFRESH_COOKIE);
    response.cookies.delete(ACCESS_COOKIE);
  }
  return response;
}

export const config = {
  // Everything except the API proxy, Next internals and static files.
  matcher: ["/((?!api/|_next/|icons/|favicon.ico|.*\\.(?:png|svg|jpg|jpeg|webp|ico)$).*)"],
};
