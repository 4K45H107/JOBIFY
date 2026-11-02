"use client";

import "./globals.css";

/** Last resort when the root layout itself fails: no fonts or theme cookie, plain markup. */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-bg p-6 text-center font-sans text-fg">
        <h1 className="text-3xl font-medium">Something went wrong</h1>
        <p className="text-fg-subtle">Jobify couldn&apos;t load. Please try again in a moment.</p>
        <button
          type="button"
          onClick={reset}
          className="h-10 rounded-full bg-primary px-8 font-medium tracking-label text-primary-fg uppercase"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
