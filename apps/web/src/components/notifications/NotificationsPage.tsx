"use client";

import { useState } from "react";
import type { Notification, NotificationFeed } from "@jobify/shared";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { api } from "@/lib/api/client";
import { NotificationList } from "./NotificationList";
import { useNotificationStream } from "./useNotificationStream";

export function NotificationsPage({ initial }: { initial: NotificationFeed }) {
  const [items, setItems] = useState(initial.items);
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [loading, setLoading] = useState(false);
  useNotificationStream((n) => setItems((list) => [n, ...list]));

  const more = async () => {
    if (!cursor) return;
    setLoading(true);
    try {
      const feed = await api<NotificationFeed>(`/notifications?cursor=${cursor}`);
      setItems((list) => [...list, ...feed.items]);
      setCursor(feed.nextCursor);
    } finally {
      setLoading(false);
    }
  };

  const open = (n: Notification) => {
    if (!n.readAt) void api(`/notifications/${n.id}/read`, { method: "POST" }).catch(() => {});
  };

  return (
    <Card className="mx-auto max-w-3xl p-0 md:p-0">
      <header className="flex items-center justify-between border-b border-border px-5 py-4">
        <h1 className="text-2xl font-medium">Notifications</h1>
        <Button
          size="sm"
          variant="ghost"
          disabled={items.every((n) => n.readAt)}
          onClick={async () => {
            await api("/notifications/read-all", { method: "POST" });
            setItems((list) =>
              list.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })),
            );
          }}
        >
          Mark all as read
        </Button>
      </header>
      <NotificationList items={items} onOpen={open} />
      {cursor && (
        <div className="flex justify-center border-t border-border p-4">
          <Button size="sm" variant="outline" onClick={more} disabled={loading}>
            {loading ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}
    </Card>
  );
}
