import { createPrismaClient } from "@jobify/db";
import { createMailer } from "@jobify/email";
import { EMAIL_QUEUE, emailJobSchema } from "@jobify/shared";
import { Queue, Worker } from "bullmq";
import Redis from "ioredis";
import { enqueueEmails, markEmailFailed, sendNotificationEmail } from "./email";
import { env } from "./env";
import { publishNotifications } from "./publish";
import { sendInterviewReminders } from "./reminders";

const QUEUE = "maintenance";
const connection = { url: env.REDIS_URL, maxRetriesPerRequest: null };

async function main() {
  const prisma = createPrismaClient(env.DATABASE_URL);
  const publisher = new Redis(env.REDIS_URL);
  const queue = new Queue(QUEUE, { connection });
  const emailQueue = new Queue(EMAIL_QUEUE, { connection });
  const mailer = createMailer(env);
  const emailDeps = {
    prisma,
    mailer,
    config: {
      enabled: env.EMAIL_ENABLED,
      webOrigin: env.WEB_ORIGIN,
      secret: env.JWT_ACCESS_SECRET,
      timeZone: env.EMAIL_TIME_ZONE,
    },
  };

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
        await enqueueEmails(
          emailQueue,
          rows.map((r) => r.id),
        );
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

  // Notification emails, queued by the API and by the reminder job above.
  const emailWorker = new Worker(
    EMAIL_QUEUE,
    async (job) => {
      const { notificationId } = emailJobSchema.parse(job.data);
      return sendNotificationEmail(emailDeps, notificationId, { retry: job.attemptsMade > 0 });
    },
    { connection, concurrency: 5 },
  );
  emailWorker.on("completed", (job, result) => {
    if (result.outcome === "sent")
      console.log(`[worker] email sent for ${job.data.notificationId}`);
  });
  emailWorker.on("failed", (job, error) => {
    console.error(`[worker] email for ${job?.data.notificationId} failed:`, error.message);
    if (job && job.attemptsMade >= (job.opts.attempts ?? 1)) {
      void markEmailFailed(prisma, job.data.notificationId, error.message);
    }
  });

  console.log(
    `[worker] running: interview reminders every minute; emails via ${mailer.provider}` +
      (env.EMAIL_ENABLED ? "" : " (turned off)"),
  );

  const shutdown = async () => {
    await worker.close();
    await emailWorker.close();
    await queue.close();
    await emailQueue.close();
    publisher.disconnect();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

void main();
