import type { UserRole } from "@jobify/shared";

export const AUTH_PAGES = ["/login", "/register"];

/** Where a user lands after signing in, or when they open a page meant for the other role. */
export function homeFor(role: UserRole): string {
  return role === "EMPLOYER" ? "/employer" : "/";
}

export function isEmployerPath(pathname: string): boolean {
  return pathname === "/employer" || pathname.startsWith("/employer/");
}

/** Only same-site relative paths are allowed as ?next= targets (no open redirects). */
export function safeNext(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\"))
    return null;
  return next;
}

export type RouteDecision = { type: "allow" } | { type: "redirect"; to: string };

/**
 * Pure routing rules used by the middleware.
 * `role` is null when the visitor has no session.
 */
export function decideRoute(
  pathname: string,
  search: string,
  role: UserRole | null,
): RouteDecision {
  const isAuthPage = AUTH_PAGES.includes(pathname);

  if (!role) {
    if (isAuthPage) return { type: "allow" };
    const next = encodeURIComponent(pathname + search);
    return { type: "redirect", to: pathname === "/" ? "/login" : `/login?next=${next}` };
  }

  if (isAuthPage) return { type: "redirect", to: homeFor(role) };
  if (role === "EMPLOYER" && !isEmployerPath(pathname))
    return { type: "redirect", to: "/employer" };
  if (role !== "EMPLOYER" && isEmployerPath(pathname)) return { type: "redirect", to: "/" };
  return { type: "allow" };
}
