"use client";

import Link from "next/link";
import type { Notification } from "@jobify/shared";
import { cn } from "@/lib/cn";
import { timeAgo } from "@/lib/format";

export function NotificationList({
  items,
  onOpen,
  compact = false,
}: {
  items: Notification[];
  onOpen: (n: Notification) => void;
  compact?: boolean;
}) {
  if (items.length === 0)
    return <p className="p-6 text-center text-sm text-fg-subtle">You&apos;re all caught up.</p>;
  return (
    <ul className="divide-y divide-border">
      {items.map((n) => (
        <li key={n.id}>
          <Link
            href={n.href}
            onClick={() => onOpen(n)}
            className={cn(
              "flex gap-3 px-4 hover:bg-surface-grey",
              compact ? "py-3" : "py-4",
              !n.readAt && "bg-chip/10",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "mt-2 size-2 shrink-0 rounded-full",
                n.readAt ? "bg-transparent" : "bg-selected",
              )}
            />
            <span className="min-w-0 flex-1">
              <span className={cn("block", !n.readAt && "font-medium")}>{n.title}</span>
              <span className="block text-sm text-fg-muted">{n.body}</span>
            </span>
            <time dateTime={n.createdAt} className="shrink-0 text-xs text-fg-subtle">
              {timeAgo(n.createdAt)}
            </time>
            {!n.readAt && <span className="sr-only">(unread)</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
}
