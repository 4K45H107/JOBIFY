import type { Notification as Row, PrismaClient } from "@jobify/db";

/** Remind both parties this long before an interview starts. */
export const REMINDER_LEAD_MS = 15 * 60_000;

/**
 * Finds scheduled interviews starting within the lead time that haven't been
 * reminded yet, claims each one (so overlapping runs or several workers don't
 * double-send), and creates an INTERVIEW_REMINDER for the seeker and the
 * interviewer. Returns the created rows.
 */
export async function sendInterviewReminders(
  prisma: PrismaClient,
  now = new Date(),
): Promise<Row[]> {
  const due = await prisma.interview.findMany({
    where: {
      status: "SCHEDULED",
      reminderSentAt: null,
      scheduledAt: { gt: now, lte: new Date(now.getTime() + REMINDER_LEAD_MS) },
    },
    include: { application: { include: { job: { include: { company: true } } } } },
  });

  const created: Row[] = [];
  for (const interview of due) {
    const claimed = await prisma.interview.updateMany({
      where: { id: interview.id, reminderSentAt: null },
      data: { reminderSentAt: now },
    });
    if (claimed.count === 0) continue;

    const payload = {
      interviewId: interview.id,
      jobTitle: interview.application.job.title,
      company: interview.application.job.company.name,
      scheduledAt: interview.scheduledAt.toISOString(),
    };
    created.push(
      ...(await prisma.notification.createManyAndReturn({
        data: [interview.application.seekerId, interview.createdById].map((userId) => ({
          userId,
          type: "INTERVIEW_REMINDER" as const,
          payload,
        })),
      })),
    );
  }
  return created;
}
