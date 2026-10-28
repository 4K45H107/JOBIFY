import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

export * from "./generated/prisma/client";

/** node-postgres driver adapter. Prisma 7 requires one. */
export function createPrismaAdapter(connectionString: string): PrismaPg {
  return new PrismaPg({ connectionString });
}

/** Creates a standalone Prisma client (scripts, seed, worker). */
export function createPrismaClient(connectionString: string): PrismaClient {
  return new PrismaClient({ adapter: createPrismaAdapter(connectionString) });
}
