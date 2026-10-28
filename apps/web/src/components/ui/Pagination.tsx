import Link from "next/link";
import { cn } from "@/lib/cn";

/** Prev/next links that keep the current query string. */
export function Pagination({
  page,
  pageSize,
  total,
  basePath,
  params,
}: {
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
  params: Record<string, string | undefined>;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const href = (p: number) => {
    const query = new URLSearchParams(
      Object.entries({ ...params, page: String(p) }).filter((entry): entry is [string, string] =>
        Boolean(entry[1]),
      ),
    );
    return `${basePath}?${query}`;
  };
  const link = "rounded-[10px] border border-outline px-4 py-2 text-sm tracking-label uppercase";
  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-4 py-4">
      {page > 1 ? (
        <Link href={href(page - 1)} className={cn(link, "hover:bg-surface-grey")}>
          Previous
        </Link>
      ) : (
        <span className={cn(link, "opacity-40")}>Previous</span>
      )}
      <span className="text-sm text-fg-subtle">
        Page {page} of {pages}
      </span>
      {page < pages ? (
        <Link href={href(page + 1)} className={cn(link, "hover:bg-surface-grey")}>
          Next
        </Link>
      ) : (
        <span className={cn(link, "opacity-40")}>Next</span>
      )}
    </nav>
  );
}
