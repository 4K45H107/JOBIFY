import { cn } from "@/lib/cn";

// Background colours for initials. White text has at least 4.5:1 contrast on each.
const COLORS = [
  "#1d4ed8",
  "#6d28d9",
  "#0f766e",
  "#b45309",
  "#be185d",
  "#4338ca",
  "#15803d",
  "#c2410c",
];

/** "Ayesha Rahman" -> "AR", "Prince" -> "P", "jane.doe@x.com" -> "JD". */
export function initials(name: string): string {
  const words = name
    .split("@")[0]!
    .split(/[\s._-]+/)
    .filter(Boolean);
  const first = words[0]?.[0] ?? "";
  const last = words.length > 1 ? (words.at(-1)?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

/** The same name always gets the same colour. */
export function avatarColor(name: string): string {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return COLORS[Math.abs(hash) % COLORS.length]!;
}

/**
 * Uploaded photo; otherwise the person's initials on a colour picked from their name (as in
 * Google, Slack or GitHub); otherwise a neutral silhouette. The SVG scales with any size class.
 */
export function Avatar({
  src,
  name,
  alt,
  className,
}: {
  src: string | null;
  name?: string | null;
  alt: string;
  className?: string;
}) {
  if (src) {
    return (
      // Photos come from /api/files (signed redirect), so no next/image optimisation.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={cn("rounded-full bg-surface-grey object-cover", className)}
      />
    );
  }

  const letters = name ? initials(name) : "";
  const a11y = alt ? { role: "img", "aria-label": alt } : { "aria-hidden": true };
  return (
    <svg
      viewBox="0 0 40 40"
      {...a11y}
      className={cn("shrink-0 rounded-full select-none", className)}
    >
      {letters ? (
        <>
          <circle cx="20" cy="20" r="20" fill={avatarColor(name!)} />
          <text
            x="20"
            y="20"
            dy="0.35em"
            textAnchor="middle"
            fill="#fff"
            fontSize={letters.length > 1 ? 15 : 17}
            fontWeight={600}
            fontFamily="inherit"
          >
            {letters}
          </text>
        </>
      ) : (
        <>
          <circle cx="20" cy="20" r="20" fill="#d4d4d8" />
          <circle cx="20" cy="15.5" r="7" fill="#fafafa" />
          <path
            d="M6.5 34.5a13.5 11 0 0 1 27 0A19.9 19.9 0 0 1 20 40a19.9 19.9 0 0 1-13.5-5.5Z"
            fill="#fafafa"
          />
        </>
      )}
    </svg>
  );
}
