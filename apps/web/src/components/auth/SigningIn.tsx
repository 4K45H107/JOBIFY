"use client";

import { useEffect, useRef } from "react";
import type { AuthUser } from "@jobify/shared";
import { api } from "@/lib/api/client";
import { useAuthRedirect } from "./useAuthRedirect";

/** After Google: the session cookies are set; reuse the normal "where to now" rules. */
export function SigningIn() {
  const redirect = useAuthRedirect();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    api<AuthUser>("/auth/me")
      .then(redirect)
      .catch(() => window.location.replace("/login?error=google"));
  }, [redirect]);

  return <p className="text-lg text-fg-subtle">Signing you in…</p>;
}
