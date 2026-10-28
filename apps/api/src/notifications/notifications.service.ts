import { Injectable } from "@nestjs/common";
import type { NotificationType, Prisma } from "@jobify/db";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Other modules record notifications through this service only.
 * The feed, unread counts and realtime push come with the notifications task in Phase 3.
 */
@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async notify(
    userIds: string[],
    type: NotificationType,
    payload: Prisma.InputJsonObject,
  ): Promise<void> {
    if (userIds.length === 0) return;
    await this.prisma.notification.createMany({
      data: userIds.map((userId) => ({ userId, type, payload })),
    });
  }
}
