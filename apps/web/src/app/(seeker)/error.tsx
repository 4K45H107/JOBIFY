"use client";

import { ErrorState } from "@/components/states/ErrorState";

/** Errors inside the signed-in area keep the top bar and sidebar. */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorState error={error} reset={reset} homeHref="/" />;
}
