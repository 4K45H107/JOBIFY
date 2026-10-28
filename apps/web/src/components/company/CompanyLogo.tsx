import { cn } from "@/lib/cn";

/** Uploaded logo, or the company's initials on a neutral tile. */
export function CompanyLogo({
  name,
  src,
  className,
}: {
  name: string;
  src: string | null;
  className?: string;
}) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={`${name} logo`}
        className={cn("rounded-[10px] bg-bg object-cover", className)}
      />
    );
  }
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return (
    <span
      aria-hidden
      className={cn(
        "flex items-center justify-center rounded-[10px] bg-surface-muted font-semibold text-fg-muted",
        className,
      )}
    >
      {initials}
    </span>
  );
}
