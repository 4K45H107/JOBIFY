import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createPrismaAdapter, PrismaClient } from "@jobify/db";
import type { Env } from "../config/env";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(config: ConfigService<Env, true>) {
    super({ adapter: createPrismaAdapter(config.get("DATABASE_URL", { infer: true })) });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /** True when the database answers a trivial query. */
  async isHealthy(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
