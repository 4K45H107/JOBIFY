"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Notification, NotificationFeed } from "@jobify/shared";
import { api } from "@/lib/api/client";
import { NotificationList } from "./NotificationList";
import { useNotificationStream } from "./useNotificationStream";

/** Top-bar bell (Figma "Notification" icon) with unread badge, dropdown and live updates. */
export function NotificationBell({ allHref }: { allHref: string }) {
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[] | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api<{ unread: number }>("/notifications/unread-count")
      .then((r) => setUnread(r.unread))
      .catch(() => {});
  }, []);

  useNotificationStream((n) => {
    setUnread((u) => u + 1);
    setItems((list) => (list ? [n, ...list] : list));
  });

  useEffect(() => {
    if (!open) return;
    api<NotificationFeed>("/notifications?limit=8")
      .then((feed) => {
        setItems(feed.items);
        setUnread(feed.unread);
      })
      .catch(() => setItems([]));
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (
        e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)
      )
        setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const markRead = (n: Notification) => {
    setOpen(false);
    if (n.readAt) return;
    setUnread((u) => Math.max(0, u - 1));
    void api(`/notifications/${n.id}/read`, { method: "POST" }).catch(() => {});
  };

  const markAll = async () => {
    await api("/notifications/read-all", { method: "POST" });
    setUnread(0);
    setItems(
      (list) => list?.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })) ?? null,
    );
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="relative transition-opacity hover:opacity-80"
      >
        <Image src="/icons/bell.svg" alt="" width={24} height={21} />
        {unread > 0 && (
          <span className="absolute -top-2 -right-2 min-w-5 rounded-full bg-heading-accent px-1 text-center text-xs leading-5 font-semibold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 z-30 mt-3 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-[10px] border border-border bg-bg text-fg shadow-lg"
        >
          <header className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="font-medium">Notifications</h2>
            {unread > 0 && (
              <button type="button" onClick={markAll} className="text-sm text-link hover:underline">
                Mark all as read
              </button>
            )}
          </header>
          <div className="max-h-[60vh] overflow-y-auto">
            {items === null ? (
              <p className="p-6 text-center text-sm text-fg-subtle">Loading…</p>
            ) : (
              <NotificationList items={items} onOpen={markRead} compact />
            )}
          </div>
          <Link
            href={allHref}
            onClick={() => setOpen(false)}
            className="block border-t border-border px-4 py-3 text-center text-sm text-link hover:bg-surface-grey"
          >
            See all
          </Link>
        </div>
      )}
    </div>
  );
}
