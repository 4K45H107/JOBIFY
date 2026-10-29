import { NOTIFICATIONS_CHANNEL, type NotificationRow } from "@jobify/shared";
import type { Notification as Row } from "@jobify/db";
import type Redis from "ioredis";

/** Sends stored rows to the API instances, which push them to connected users. */
export async function publishNotifications(
  redis: Pick<Redis, "publish">,
  rows: Row[],
): Promise<void> {
  for (const row of rows) {
    const message: NotificationRow = {
      id: row.id,
      userId: row.userId,
      type: row.type,
      payload: (row.payload ?? {}) as Record<string, unknown>,
      readAt: row.readAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    };
    await redis.publish(NOTIFICATIONS_CHANNEL, JSON.stringify(message));
  }
}
