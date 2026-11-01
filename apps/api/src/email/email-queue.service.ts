import { Inject, Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EMAIL_JOB_NAME, EMAIL_QUEUE, emailJobOptions } from "@jobify/shared";
import { Queue } from "bullmq";
import type { Env } from "../config/env";

/**
 * Hands notifications to the worker, which renders and sends the emails. Queuing (not
 * sending) keeps a slow or failing email provider out of the request. Without REDIS_URL
 * nothing is queued: no worker would run anyway.
 */
@Injectable()
export class EmailQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(EmailQueueService.name);
  private readonly queue: Queue | null;

  constructor(@Inject(ConfigService) config: ConfigService<Env, true>) {
    const url = config.get("REDIS_URL", { infer: true });
    this.queue = url
      ? new Queue(EMAIL_QUEUE, { connection: { url, maxRetriesPerRequest: 3 } })
      : null;
  }

  /** Never throws: a notification must not fail because its email couldn't be queued. */
  async enqueue(notificationIds: string[]): Promise<void> {
    if (!this.queue || notificationIds.length === 0) return;
    try {
      await this.queue.addBulk(
        notificationIds.map((notificationId) => ({
          name: EMAIL_JOB_NAME,
          data: { notificationId },
          opts: emailJobOptions(notificationId),
        })),
      );
    } catch (error) {
      this.logger.warn(`Couldn't queue emails: ${(error as Error).message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue?.close();
  }
}
