import { cn } from "@/lib/cn";

/** A grey placeholder block that pulses while content loads (still for reduced motion). */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-pulse rounded-[8px] bg-surface-grey motion-reduce:animate-none",
        className,
      )}
    />
  );
}
