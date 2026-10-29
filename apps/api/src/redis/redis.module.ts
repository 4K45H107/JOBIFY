import { Global, Inject, Injectable, Logger, Module, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";
import type { Env } from "../config/env";

/**
 * Redis connections for pub/sub. A subscriber connection can't run other
 * commands, so there are two. Both are null when REDIS_URL isn't set; callers
 * then fall back to in-process behaviour.
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  readonly publisher: Redis | null;
  readonly subscriber: Redis | null;

  constructor(@Inject(ConfigService) config: ConfigService<Env, true>) {
    const url = config.get("REDIS_URL", { infer: true });
    const connect = (role: "publisher" | "subscriber") => {
      const client = new Redis(url!, {
        maxRetriesPerRequest: 3,
        // The ready check sends INFO, which Redis rejects on a connection in subscribe mode.
        enableReadyCheck: role === "publisher",
      });
      client.on("error", (e) => this.logger.warn(`Redis ${role}: ${e.message}`));
      return client;
    };
    this.publisher = url ? connect("publisher") : null;
    this.subscriber = url ? connect("subscriber") : null;
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([this.publisher?.quit(), this.subscriber?.quit()]);
  }
}

@Global()
@Module({ providers: [RedisService], exports: [RedisService] })
export class RedisModule {}
