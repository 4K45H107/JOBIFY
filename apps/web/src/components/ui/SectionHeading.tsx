import { cn } from "@/lib/cn";

/** Figma "TRENDING" / "LATEST": red, semibold, uppercase, wide tracking. */
export function SectionHeading({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn(
        "text-2xl font-semibold tracking-label text-heading-accent uppercase",
        className,
      )}
      {...props}
    />
  );
}
