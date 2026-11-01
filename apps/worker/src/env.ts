import path from "node:path";
import { config } from "dotenv";
import { z } from "zod";

config({ path: path.resolve(__dirname, "../../../.env"), quiet: true });

export const env = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
    REDIS_URL: z.url({ protocol: /^rediss?$/ }).default("redis://localhost:6379"),
    /** Links in emails point here. */
    WEB_ORIGIN: z.url().default("http://localhost:3000"),
    /** Signs unsubscribe links (the API verifies them with the same value). */
    JWT_ACCESS_SECRET: z.string().min(32),
    EMAIL_ENABLED: z
      .enum(["true", "false"])
      .default("true")
      .transform((v) => v === "true"),
    /** Set in production: real email through Brevo. Unset: SMTP_URL (Mailpit locally). */
    BREVO_API_KEY: z.string().optional(),
    SMTP_URL: z.string().default("smtp://localhost:1025"),
    MAIL_FROM: z.string().default("Jobify <no-reply@jobify.local>"),
    /** Interview times in emails are shown in this zone. */
    EMAIL_TIME_ZONE: z.string().default("Asia/Dhaka"),
  })
  .parse(process.env);
