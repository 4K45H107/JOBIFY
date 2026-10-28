import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "./generated/prisma/client";

export * from "./generated/prisma/client";

/** node-postgres driver adapter. Prisma 7 requires one. */
export function createPrismaAdapter(connectionString: string): PrismaPg {
  return new PrismaPg({ connectionString });
}

/** Creates a standalone Prisma client (scripts, seed, worker). */
export function createPrismaClient(connectionString: string): PrismaClient {
  return new PrismaClient({ adapter: createPrismaAdapter(connectionString) });
}

/** True when a Prisma call failed on a unique constraint (e.g. duplicate email). */
export function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}
