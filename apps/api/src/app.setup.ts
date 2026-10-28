import { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import { cleanupOpenApiDoc } from "nestjs-zod";
import type { Env } from "./config/env";

export const API_PREFIX = "api";

/** HTTP-level setup shared by main.ts and the e2e tests. */
export function setupApp(app: INestApplication): void {
  const config = app.get(ConfigService<Env, true>);

  app.setGlobalPrefix(API_PREFIX);
  app.use(helmet());
  app.enableCors({ origin: config.get("WEB_ORIGIN", { infer: true }), credentials: true });
  app.enableShutdownHooks();

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle("Jobify API")
      .setDescription("REST API for the Jobify hiring platform.")
      .setVersion("0.1.0")
      .build(),
  );
  SwaggerModule.setup(`${API_PREFIX}/docs`, app, cleanupOpenApiDoc(document), {
    jsonDocumentUrl: `${API_PREFIX}/docs-json`,
  });
}
