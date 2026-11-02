"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

/** What a route's error.tsx shows: a plain explanation, a retry, and a way home. */
export function ErrorState({
  error,
  reset,
  homeHref,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  homeHref: string;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section
      role="alert"
      className="mx-auto flex max-w-lg flex-col items-center gap-4 py-16 text-center"
    >
      <h1 className="text-3xl font-medium">Something went wrong</h1>
      <p className="text-fg-subtle">
        This page couldn&apos;t load. It may be a hiccup on our side, or the server may still be
        waking up. Please try again.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <Link
          href={homeHref}
          className="inline-flex h-10 items-center rounded-[10px] border border-outline px-8 font-medium tracking-label text-outline uppercase hover:bg-surface-grey"
        >
          Go home
        </Link>
      </div>
      {error.digest && <p className="text-xs text-fg-subtle">Error reference: {error.digest}</p>}
    </section>
  );
}
