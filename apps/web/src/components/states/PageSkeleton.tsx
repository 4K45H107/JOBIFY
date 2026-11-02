import { Skeleton } from "@/components/ui/Skeleton";
import { SlowServerNotice } from "./SlowServerNotice";

/** Loading screen for signed-in pages: a heading and a few cards, inside the app shell. */
export function PageSkeleton() {
  return (
    <div aria-busy="true" className="mx-auto flex max-w-6xl flex-col gap-6">
      <span className="sr-only">Loading…</span>
      <Skeleton className="h-9 w-56" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
      <SlowServerNotice />
    </div>
  );
}
