import { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { cleanupOpenApiDoc } from "nestjs-zod";
import type { Env } from "./config/env";

export const API_PREFIX = "api";

/** HTTP-level setup shared by main.ts and the e2e tests. */
export function setupApp(app: INestApplication): void {
  const config = app.get(ConfigService<Env, true>);

  // Real client IPs (for rate limiting) come from the trusted proxy's X-Forwarded-For.
  app
    .getHttpAdapter()
    .getInstance()
    .set("trust proxy", config.get("TRUST_PROXY", { infer: true }));
  app.setGlobalPrefix(API_PREFIX);
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({ origin: config.get("WEB_ORIGIN", { infer: true }), credentials: true });
  app.enableShutdownHooks();

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle("Jobify API")
      .setDescription("REST API for the Jobify hiring platform.")
      .setVersion("0.1.0")
      .addCookieAuth("jobify_access")
      .build(),
  );
  SwaggerModule.setup(`${API_PREFIX}/docs`, app, cleanupOpenApiDoc(document), {
    jsonDocumentUrl: `${API_PREFIX}/docs-json`,
  });
}
