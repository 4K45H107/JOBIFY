import type { INestApplication } from "@nestjs/common";
import { PrismaService } from "../src/prisma/prisma.service";

/**
 * Suffix that keeps each test file's data apart. Files run in parallel, so a
 * timestamp alone can collide and one file's cleanup would delete another's rows.
 */
export const uniqueRun = (): string =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/** Applying to and posting jobs need a verified email; tests skip the emailed link. */
export const markVerified = (app: INestApplication, email: string) =>
  app.get(PrismaService).user.update({ where: { email }, data: { emailVerifiedAt: new Date() } });
