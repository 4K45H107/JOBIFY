import { Controller, Get, HttpCode, MessageEvent, Param, Post, Query, Sse } from "@nestjs/common";
import { ApiNoContentResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { notificationFeedQuerySchema, notificationFeedSchema } from "@jobify/shared";
import { createZodDto, ZodSerializerDto } from "nestjs-zod";
import { filter, interval, map, merge, Observable } from "rxjs";
import { CurrentUser, type RequestUser } from "../auth/decorators/current-user.decorator";
import { NotificationsService, toNotification } from "./notifications.service";

class FeedDto extends createZodDto(notificationFeedSchema) {}
class FeedQueryDto extends createZodDto(notificationFeedQuerySchema) {}

/** Comment lines keep proxies from closing an idle stream. */
const HEARTBEAT_MS = 25_000;

@ApiTags("notifications")
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ZodSerializerDto(FeedDto)
  @ApiOkResponse({ type: FeedDto, description: "Newest first, cursor-paginated." })
  feed(@CurrentUser() user: RequestUser, @Query() query: FeedQueryDto) {
    return this.notifications.feed(user.id, user.role, query.cursor, query.limit);
  }

  @Get("unread-count")
  @ApiOkResponse({ description: "{ unread: number }" })
  async unread(@CurrentUser() user: RequestUser) {
    return { unread: await this.notifications.unreadCount(user.id) };
  }

  @Post(":id/read")
  @HttpCode(204)
  @ApiNoContentResponse()
  markRead(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.notifications.markRead(user.id, id);
  }

  @Post("read-all")
  @HttpCode(204)
  @ApiNoContentResponse()
  markAllRead(@CurrentUser() user: RequestUser) {
    return this.notifications.markAllRead(user.id);
  }

  /** Server-Sent Events: one "notification" event per new notification for the caller. */
  @Sse("stream")
  stream(@CurrentUser() user: RequestUser): Observable<MessageEvent> {
    const mine = this.notifications.events$.pipe(
      filter((e) => e.userId === user.id),
      map((e): MessageEvent => ({ type: "notification", data: toNotification(e.row, user.role) })),
    );
    const heartbeat = interval(HEARTBEAT_MS).pipe(
      map((): MessageEvent => ({ type: "ping", data: "" })),
    );
    return merge(mine, heartbeat);
  }
}
