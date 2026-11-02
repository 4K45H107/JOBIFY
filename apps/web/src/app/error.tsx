"use client";

import { ErrorState } from "@/components/states/ErrorState";
import { StandalonePage } from "@/components/states/StandalonePage";

/** Errors outside the signed-in area, e.g. when the API is down while checking the session. */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <StandalonePage>
      <ErrorState error={error} reset={reset} homeHref="/" />
    </StandalonePage>
  );
}
