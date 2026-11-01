import { type createPrismaClient, isUniqueConstraintError } from "@jobify/db";
import { type Mailer, renderNotificationEmail, unsubscribeToken } from "@jobify/email";
import { EMAIL_JOB_NAME, EMAIL_TYPES, emailJobOptions } from "@jobify/shared";
import type { Queue } from "bullmq";

type Prisma = ReturnType<typeof createPrismaClient>;

export interface EmailConfig {
  enabled: boolean;
  webOrigin: string;
  /** Signs unsubscribe links; the API checks them with the same secret. */
  secret: string;
  timeZone: string;
}

export type EmailOutcome =
  | { outcome: "sent"; providerId: string }
  | { outcome: "skipped"; reason: string }
  | { outcome: "duplicate" | "missing" };

/** Queues one email job per notification row. */
export async function enqueueEmails(queue: Pick<Queue, "addBulk">, notificationIds: string[]) {
  if (notificationIds.length === 0) return;
  await queue.addBulk(
    notificationIds.map((notificationId) => ({
      name: EMAIL_JOB_NAME,
      data: { notificationId },
      opts: emailJobOptions(notificationId),
    })),
  );
}

/**
 * Sends the email for one notification, at most once. The EmailLog row (unique per
 * notification) is claimed before sending, so a duplicate job or a second worker stops there.
 * A failed send throws, the claim stays SENDING, and BullMQ's retry (`retry: true`) carries on.
 */
export async function sendNotificationEmail(
  deps: { prisma: Prisma; mailer: Mailer; config: EmailConfig },
  notificationId: string,
  { retry = false }: { retry?: boolean } = {},
): Promise<EmailOutcome> {
  const { prisma, mailer, config } = deps;
  const n = await prisma.notification.findUnique({
    where: { id: notificationId },
    include: {
      emailLog: true,
      user: {
        select: {
          email: true,
          role: true,
          isDemo: true,
          seekerProfile: { select: { fullName: true } },
          employerProfile: { select: { fullName: true } },
        },
      },
    },
  });
  // Deleted meanwhile (e.g. the account was removed).
  if (!n) return { outcome: "missing" };
  if (n.emailLog && (n.emailLog.status !== "SENDING" || !retry)) return { outcome: "duplicate" };

  const preference = await prisma.emailPreference.findUnique({
    where: { userId_type: { userId: n.userId, type: n.type } },
  });
  const reason = !config.enabled
    ? "Email is turned off"
    : !EMAIL_TYPES[n.user.role].some((t) => t.type === n.type)
      ? "Not an email type for this role"
      : preference?.enabled === false
        ? "Turned off in settings"
        : n.user.isDemo && mailer.provider === "brevo"
          ? "Demo account (made-up address)"
          : null;
  const log = { notificationId: n.id, userId: n.userId, type: n.type, to: n.user.email };
  if (reason) {
    await prisma.emailLog.upsert({
      where: { notificationId: n.id },
      create: { ...log, status: "SKIPPED", reason },
      update: { status: "SKIPPED", reason },
    });
    return { outcome: "skipped", reason };
  }

  if (!n.emailLog) {
    try {
      await prisma.emailLog.create({ data: { ...log, status: "SENDING" } });
    } catch (error) {
      if (isUniqueConstraintError(error)) return { outcome: "duplicate" };
      throw error;
    }
  }

  const token = unsubscribeToken(n.userId, n.type, config.secret);
  const unsubscribeUrl = new URL(`/unsubscribe?token=${token}`, config.webOrigin).toString();
  const email = await renderNotificationEmail({
    type: n.type,
    payload: (n.payload ?? {}) as Record<string, unknown>,
    role: n.user.role,
    name: n.user.seekerProfile?.fullName ?? n.user.employerProfile?.fullName ?? null,
    webOrigin: config.webOrigin,
    unsubscribeUrl,
    timeZone: config.timeZone,
  });
  const providerId = await mailer.send({
    to: n.user.email,
    ...email,
    // One-click unsubscribe (RFC 8058), shown by Gmail and Apple Mail next to the sender.
    headers: {
      "List-Unsubscribe": `<${new URL(`/api/email/unsubscribe?token=${token}`, config.webOrigin)}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });
  await prisma.emailLog.update({
    where: { notificationId: n.id },
    data: { status: "SENT", providerId, reason: null },
  });
  return { outcome: "sent", providerId };
}

/** After the last retry: record why, so the log shows it. */
export async function markEmailFailed(prisma: Prisma, notificationId: string, message: string) {
  await prisma.emailLog.updateMany({
    where: { notificationId, status: "SENDING" },
    data: { status: "FAILED", reason: message.slice(0, 500) },
  });
}
