import "server-only";
import { cookies } from "next/headers";
import { authUserSchema, type AuthUser } from "@jobify/shared";
import { ApiError, type ApiErrorBody } from "./errors";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

/** Server-side fetch to the API, forwarding the visitor's cookies. */
export async function serverApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const cookieHeader = (await cookies()).toString();
  const res = await fetch(`${API_URL}/api${path}`, {
    ...init,
    headers: { ...(cookieHeader && { cookie: cookieHeader }), ...init.headers },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new ApiError(res.status, (await res.json().catch(() => null)) as ApiErrorBody | null);
  }
  return (await res.json()) as T;
}

/** The signed-in user, or null when there is no valid session. */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    return authUserSchema.parse(await serverApi("/auth/me"));
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}
