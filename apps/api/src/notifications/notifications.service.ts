import { Injectable, Logger, NotFoundException, OnModuleInit } from "@nestjs/common";
import {
  describeNotification,
  type Notification,
  type NotificationFeed,
  NOTIFICATIONS_CHANNEL,
  notificationRowSchema,
  type UserRole,
} from "@jobify/shared";
import type { NotificationType, Prisma } from "@jobify/db";
import { Subject } from "rxjs";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.module";

type Row = Prisma.NotificationGetPayload<object>;

export interface NotificationEvent {
  userId: string;
  row: Row;
}

/**
 * The single way the API records notifications. New rows go out on Redis
 * pub/sub (NOTIFICATIONS_CHANNEL), and every API instance relays the ones for
 * its connected users to their live streams. The worker publishes the same way.
 * Without Redis (REDIS_URL unset) rows are pushed in-process.
 */
@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);
  readonly events$ = new Subject<NotificationEvent>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async onModuleInit(): Promise<void> {
    const subscriber = this.redis.subscriber;
    if (!subscriber) return;
    await subscriber.subscribe(NOTIFICATIONS_CHANNEL);
    subscriber.on("message", (_channel, message) => {
      let raw: unknown;
      try {
        raw = JSON.parse(message);
      } catch {
        raw = null;
      }
      const parsed = notificationRowSchema.safeParse(raw);
      if (!parsed.success) return this.logger.warn("Ignoring malformed notification message");
      const r = parsed.data;
      this.events$.next({
        userId: r.userId,
        row: {
          ...r,
          payload: r.payload as Prisma.JsonValue,
          readAt: r.readAt ? new Date(r.readAt) : null,
          createdAt: new Date(r.createdAt),
        },
      });
    });
  }

  async notify(
    userIds: string[],
    type: NotificationType,
    payload: Prisma.InputJsonObject,
  ): Promise<void> {
    if (userIds.length === 0) return;
    const rows = await this.prisma.notification.createManyAndReturn({
      data: userIds.map((userId) => ({ userId, type, payload })),
    });
    for (const row of rows) await this.publish(row);
  }

  private async publish(row: Row): Promise<void> {
    if (!this.redis.publisher) {
      this.events$.next({ userId: row.userId, row });
      return;
    }
    await this.redis.publisher.publish(
      NOTIFICATIONS_CHANNEL,
      JSON.stringify({
        ...row,
        readAt: row.readAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
      }),
    );
  }

  async feed(
    userId: string,
    role: UserRole,
    cursor: string | undefined,
    limit: number,
  ): Promise<NotificationFeed> {
    const rows = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });
    const page = rows.slice(0, limit);
    return {
      items: page.map((r) => toNotification(r, role)),
      unread: await this.unreadCount(userId),
      nextCursor: rows.length > limit ? page.at(-1)!.id : null,
    };
  }

  unreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, readAt: null } });
  }

  async markRead(userId: string, id: string): Promise<void> {
    const updated = await this.prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });
    if (
      updated.count === 0 &&
      !(await this.prisma.notification.findFirst({ where: { id, userId } }))
    ) {
      throw new NotFoundException("Notification not found");
    }
  }

  async markAllRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }
}

export function toNotification(row: Row, role: UserRole): Notification {
  return {
    id: row.id,
    type: row.type,
    ...describeNotification(row.type, (row.payload ?? {}) as Record<string, unknown>, role),
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}
