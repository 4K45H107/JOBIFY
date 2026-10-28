"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { isNavItemActive, type NavItem } from "./nav";

/** Desktop sidebar. Figma: 228px grey rail, items centred vertically, black marker on the active item. */
export function Sidebar({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="hidden w-[228px] shrink-0 flex-col justify-center bg-sidebar text-sidebar-fg md:flex"
    >
      <ul className="flex flex-col gap-4">
        {items.map((item) => {
          const active = isNavItemActive(pathname, item);
          return (
            <li key={item.href} className="relative">
              {active && (
                <Image
                  src="/icons/nav-marker.svg"
                  alt=""
                  width={11}
                  height={49}
                  className="icon-themed absolute top-1/2 left-[13px] -translate-y-1/2"
                />
              )}
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-6 py-2 pr-4 pl-11 text-base tracking-label transition-opacity hover:opacity-70",
                  active && "font-medium",
                )}
              >
                <Image
                  src={item.icon}
                  loading="eager"
                  alt=""
                  width={30}
                  height={30}
                  className="icon-themed size-[30px] shrink-0"
                />
                <span className="leading-tight">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
