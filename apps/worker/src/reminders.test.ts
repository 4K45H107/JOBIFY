import { randomUUID } from "node:crypto";
import { createPrismaClient } from "@jobify/db";
import { afterAll, describe, expect, it } from "vitest";
import { env } from "./env";
import { publishNotifications } from "./publish";
import { sendInterviewReminders } from "./reminders";

const prisma = createPrismaClient(env.DATABASE_URL);
const tag = randomUUID().slice(0, 8);
const ids: { interviews: string[] } = { interviews: [] };

async function interviewIn(minutes: number, status: "SCHEDULED" | "CANCELLED" = "SCHEDULED") {
  const employer = await prisma.user.create({
    data: { email: `e.${randomUUID()}@worker-test.test`, role: "EMPLOYER" },
  });
  const seeker = await prisma.user.create({
    data: { email: `s.${randomUUID()}@worker-test.test`, role: "SEEKER" },
  });
  const company = await prisma.company.create({
    data: { name: `Worker Co ${randomUUID()}`, slug: `worker-${randomUUID()}` },
  });
  const job = await prisma.job.create({
    data: {
      companyId: company.id,
      postedById: employer.id,
      title: `Reminder role ${tag}`,
      type: "FULL_TIME",
      workplace: "REMOTE",
      country: "BD",
      salaryMin: 1,
      salaryMax: 2,
      description: "x",
    },
  });
  const application = await prisma.application.create({
    data: { jobId: job.id, seekerId: seeker.id, cvKey: "k", contact: {}, stage: "INTERVIEW" },
  });
  const interview = await prisma.interview.create({
    data: {
      applicationId: application.id,
      createdById: employer.id,
      stage: "Final round",
      scheduledAt: new Date(Date.now() + minutes * 60_000),
      durationMin: 30,
      status,
      roomName: `room-${randomUUID()}`,
    },
  });
  ids.interviews.push(interview.id);
  return { interview, seekerId: seeker.id, employerId: employer.id };
}

// Other runs may leave due interviews behind, so assertions only look at this file's interviews.
describe("sendInterviewReminders", () => {
  afterAll(async () => {
    await prisma.company.deleteMany({ where: { name: { startsWith: "Worker Co" } } });
    await prisma.user.deleteMany({ where: { email: { endsWith: "@worker-test.test" } } });
    await prisma.$disconnect();
  });

  it("reminds both parties once for interviews starting within 15 minutes", async () => {
    const soon = await interviewIn(10);
    const later = await interviewIn(60);
    const cancelled = await interviewIn(5, "CANCELLED");

    const rows = (await sendInterviewReminders(prisma)).filter((r) =>
      [soon, later, cancelled].some(
        (i) => (r.payload as { interviewId: string }).interviewId === i.interview.id,
      ),
    );
    expect(rows.map((r) => r.userId).sort()).toEqual([soon.seekerId, soon.employerId].sort());
    expect(rows[0]).toMatchObject({
      type: "INTERVIEW_REMINDER",
      payload: { jobTitle: `Reminder role ${tag}` },
    });

    // A second run doesn't remind again.
    const again = (await sendInterviewReminders(prisma)).filter(
      (r) => (r.payload as { interviewId: string }).interviewId === soon.interview.id,
    );
    expect(again).toHaveLength(0);
    expect(
      (await prisma.interview.findUniqueOrThrow({ where: { id: soon.interview.id } }))
        .reminderSentAt,
    ).not.toBeNull();
  });

  it("publishes each row on the notifications channel", async () => {
    const published: [string, string][] = [];
    const { interview } = await interviewIn(3);
    const rows = (await sendInterviewReminders(prisma)).filter(
      (r) => (r.payload as { interviewId: string }).interviewId === interview.id,
    );
    await publishNotifications(
      {
        publish: async (channel: string, message: string) => (
          published.push([channel, message]),
          1
        ),
      },
      rows,
    );
    expect(published).toHaveLength(2);
    expect(published[0]![0]).toBe("jobify:notifications");
    expect(JSON.parse(published[0]![1])).toMatchObject({
      type: "INTERVIEW_REMINDER",
      readAt: null,
    });
  });
});
