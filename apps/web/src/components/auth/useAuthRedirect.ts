"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { AuthUser } from "@jobify/shared";
import { homeFor, isEmployerPath, safeNext } from "@/lib/auth/routing";

/** After signing in: go back to ?next= if it belongs to the user's area, else to their home. */
export function useAuthRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  return (user: AuthUser) => {
    const next = safeNext(searchParams.get("next"));
    const nextFits = next && isEmployerPath(next) === (user.role === "EMPLOYER");
    router.replace(nextFits ? next : homeFor(user.role));
    router.refresh();
  };
}
