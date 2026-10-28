import Link from "next/link";
import { cn } from "@/lib/cn";

export interface TabLink {
  label: string;
  href: string;
  active: boolean;
}

/** Figma "Jobs | Companies" switch: underlined, the active tab gets a grey fill. */
export function SegmentedTabs({ tabs, className }: { tabs: TabLink[]; className?: string }) {
  return (
    <nav className={cn("mx-auto flex w-full max-w-[536px] border-b border-fg", className)}>
      {tabs.map((tab, i) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.active ? "page" : undefined}
          className={cn(
            "flex-1 py-3 text-center text-xl tracking-label md:text-2xl",
            tab.active && "bg-surface-muted",
            i > 0 && "border-l border-fg",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

/** Figma "For You | Search" switch: small labels, the active one in a sky-blue chip. */
export function PillTabs({ tabs, className }: { tabs: TabLink[]; className?: string }) {
  return (
    <nav className={cn("flex justify-center gap-2", className)}>
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.active ? "page" : undefined}
          className={cn(
            "rounded-[5px] px-3 py-1 text-lg font-medium",
            tab.active ? "bg-chip text-chip-fg" : "text-fg hover:bg-surface-grey",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
