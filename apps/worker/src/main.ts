import { createPrismaClient } from "@jobify/db";
import { Queue, Worker } from "bullmq";
import Redis from "ioredis";
import { env } from "./env";
import { publishNotifications } from "./publish";
import { sendInterviewReminders } from "./reminders";

const QUEUE = "maintenance";
const connection = { url: env.REDIS_URL, maxRetriesPerRequest: null };

async function main() {
  const prisma = createPrismaClient(env.DATABASE_URL);
  const publisher = new Redis(env.REDIS_URL);
  const queue = new Queue(QUEUE, { connection });

  // One repeating job; BullMQ makes sure only one worker runs each tick.
  await queue.upsertJobScheduler(
    "interview-reminders",
    { every: 60_000 },
    { name: "interview-reminders" },
  );

  const worker = new Worker(
    QUEUE,
    async (job) => {
      if (job.name === "interview-reminders") {
        const rows = await sendInterviewReminders(prisma);
        await publishNotifications(publisher, rows);
        return { reminders: rows.length };
      }
      throw new Error(`Unknown job ${job.name}`);
    },
    { connection },
  );
  worker.on("completed", (job, result) => {
    if (result?.reminders) console.log(`[worker] ${job.name}: sent ${result.reminders} reminders`);
  });
  worker.on("failed", (job, error) =>
    console.error(`[worker] ${job?.name} failed:`, error.message),
  );
  console.log("[worker] running: interview reminders every minute");

  const shutdown = async () => {
    await worker.close();
    await queue.close();
    publisher.disconnect();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

void main();
