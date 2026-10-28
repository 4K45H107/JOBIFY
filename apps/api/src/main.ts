import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { setupApp } from "./app.setup";
import type { Env } from "./config/env";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  setupApp(app);

  const port = app.get(ConfigService<Env, true>).get("PORT", { infer: true });
  await app.listen(port);
  Logger.log(`API listening on http://localhost:${port}/api (docs at /api/docs)`, "Bootstrap");
}

void bootstrap();
