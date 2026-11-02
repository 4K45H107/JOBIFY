"use client";

import { useEffect, useState } from "react";
import type { AuthProviders } from "@jobify/shared";
import { api } from "@/lib/api/client";

/**
 * Whether to show "Continue with Google". Asked in the browser, after the page has rendered:
 * a server-side check would make the sign-in page wait for the free API to wake up (30-60 s).
 * `known` (tests, or a caller that already knows) skips the request.
 */
export function useGoogleSignIn(known?: boolean): boolean {
  const [enabled, setEnabled] = useState(known ?? false);
  useEffect(() => {
    if (known !== undefined) return;
    let cancelled = false;
    api<AuthProviders>("/auth/providers")
      .then((p) => !cancelled && setEnabled(p.google))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [known]);
  return known ?? enabled;
}
