"use client";

import { timeAgo } from "@/lib/format";
import { formatWhen } from "@/lib/time";
import { useHydrated } from "@/lib/use-hydrated";

const FORMATS = { ago: timeAgo, when: formatWhen };

/** A time in the viewer's clock and time zone ("3h", "Mon, 3 Nov · 14:30"), filled in after hydration. */
export function ClientTime({
  iso,
  format,
  className,
}: {
  iso: string;
  format: keyof typeof FORMATS;
  className?: string;
}) {
  const hydrated = useHydrated();
  return (
    <time dateTime={iso} className={className}>
      {hydrated ? FORMATS[format](iso) : null}
    </time>
  );
}
