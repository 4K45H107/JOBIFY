"use client";

import { ApiError, type ApiErrorBody } from "./errors";

/** One in-flight refresh shared by every request that hit a 401 at the same time. */
let refreshing: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  refreshing ??= fetch("/api/auth/refresh", { method: "POST", credentials: "same-origin" })
    .then((res) => res.ok)
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

/**
 * Browser fetch for the Jobify API (same origin, proxied by Next.js).
 * Retries once after refreshing the session when the access token has expired.
 */
export async function api<T>(
  path: string,
  init: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const { json, headers, ...rest } = init;
  const request = () =>
    fetch(`/api${path}`, {
      credentials: "same-origin",
      ...rest,
      headers: { ...(json !== undefined && { "Content-Type": "application/json" }), ...headers },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });

  let res = await request();
  if (res.status === 401 && !path.startsWith("/auth/") && (await refreshSession())) {
    res = await request();
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(res.status, body);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}
