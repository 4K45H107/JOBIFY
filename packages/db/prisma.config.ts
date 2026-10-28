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
    url: env("DATABASE_URL"),
  },
});
