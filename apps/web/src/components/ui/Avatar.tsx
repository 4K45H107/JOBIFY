import { cn } from "@/lib/cn";

/** Uploaded photo, or the Figma placeholder avatar. Photos come from /api/files, so no next/image optimisation. */
export function Avatar({
  src,
  alt,
  className,
}: {
  src: string | null;
  alt: string;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src ?? "/icons/avatar.png"}
      alt={alt}
      className={cn("rounded-full bg-surface-grey object-cover", className)}
    />
  );
}
