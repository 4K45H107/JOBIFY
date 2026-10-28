"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { isNavItemActive, type NavItem } from "./nav";

/** Bottom tab bar on small screens. Not in Figma, so it reuses the sidebar's icons and colours. */
export function MobileNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="border-t border-border bg-sidebar text-sidebar-fg md:hidden">
      <ul className="flex justify-around">
        {items.map((item) => {
          const active = isNavItemActive(pathname, item);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 px-1 py-2 text-[11px] leading-tight",
                  active ? "font-semibold" : "opacity-80",
                )}
              >
                <Image
                  src={item.icon}
                  alt=""
                  width={22}
                  height={22}
                  className="icon-themed size-[22px]"
                />
                <span className="line-clamp-1 text-center">{item.label}</span>
                <span
                  className={cn(
                    "h-0.5 w-6 rounded-full",
                    active ? "bg-sidebar-fg" : "bg-transparent",
                  )}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
