import path from "node:path";
import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Prisma 7 no longer loads .env itself. Read the repo-root .env.
config({ path: path.resolve(__dirname, "../../.env"), quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // The CLI (migrate, studio) needs a direct connection: migrations fail over a PgBouncer
    // pool. Neon provides it as DATABASE_URL_UNPOOLED. The app itself uses the pooled DATABASE_URL.
    url: process.env.DATABASE_URL_UNPOOLED || env("DATABASE_URL"),
  },
});
