"use client";

import { useEffect, useRef } from "react";
import type { Notification } from "@jobify/shared";
import { api } from "@/lib/api/client";

/**
 * Subscribes to /api/notifications/stream (Server-Sent Events). EventSource
 * retries dropped connections by itself, but a 401 closes it for good, so on a
 * closed stream we refresh the session and reconnect with backoff.
 */
export function useNotificationStream(onNotification: (n: Notification) => void) {
  const handler = useRef(onNotification);
  handler.current = onNotification;

  useEffect(() => {
    let source: EventSource | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    let stopped = false;

    const connect = () => {
      source = new EventSource("/api/notifications/stream");
      source.addEventListener("open", () => (attempts = 0));
      source.addEventListener("notification", (event) => {
        handler.current(JSON.parse((event as MessageEvent<string>).data) as Notification);
      });
      source.addEventListener("error", () => {
        if (source?.readyState !== EventSource.CLOSED || stopped) return;
        const delay = Math.min(30_000, 1000 * 2 ** attempts++);
        retry = setTimeout(async () => {
          await api("/auth/refresh", { method: "POST" }).catch(() => undefined);
          if (!stopped) connect();
        }, delay);
      });
    };

    connect();
    return () => {
      stopped = true;
      clearTimeout(retry);
      source?.close();
    };
  }, []);
}
