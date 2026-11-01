import { randomUUID } from "node:crypto";
import { createPrismaClient, type NotificationType } from "@jobify/db";
import { type Mailer, type OutgoingEmail, smtpMailer } from "@jobify/email";
import { afterAll, describe, expect, it, vi } from "vitest";
import { enqueueEmails, markEmailFailed, sendNotificationEmail } from "./email";
import { env } from "./env";

const prisma = createPrismaClient(env.DATABASE_URL);
const DOMAIN = "@worker-email.test";
const config = {
  enabled: true,
  webOrigin: "https://jobify.test",
  secret: "s".repeat(40),
  timeZone: "Asia/Dhaka",
};

function fakeMailer(provider: Mailer["provider"] = "smtp") {
  const sent: OutgoingEmail[] = [];
  const mailer: Mailer = {
    provider,
    send: vi.fn(async (e) => (sent.push(e), `id-${sent.length}`)),
  };
  return { mailer, sent };
}

async function notificationFor(
  opts: { role?: "SEEKER" | "EMPLOYER"; isDemo?: boolean; type?: NotificationType } = {},
) {
  const user = await prisma.user.create({
    data: {
      email: `u.${randomUUID()}${DOMAIN}`,
      role: opts.role ?? "SEEKER",
      isDemo: opts.isDemo ?? false,
      seekerProfile: opts.role === "EMPLOYER" ? undefined : { create: { fullName: "Mina Das" } },
    },
  });
  return prisma.notification.create({
    data: {
      userId: user.id,
      type: opts.type ?? "ASSESSMENT_ASSIGNED",
      payload: { jobTitle: "QA Engineer", company: "Acme", applicationId: "app1" },
    },
  });
}

const logOf = (notificationId: string) =>
  prisma.emailLog.findUniqueOrThrow({ where: { notificationId } });

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: DOMAIN } } });
  await prisma.$disconnect();
});

describe("sendNotificationEmail", () => {
  it("sends once, with the rendered email and one-click unsubscribe headers", async () => {
    const n = await notificationFor();
    const { mailer, sent } = fakeMailer();
    const result = await sendNotificationEmail({ prisma, mailer, config }, n.id);

    expect(result).toEqual({ outcome: "sent", providerId: "id-1" });
    expect(sent[0]!.subject).toBe("Skill test for QA Engineer");
    expect(sent[0]!.html).toContain("Hi Mina,");
    expect(sent[0]!.headers!["List-Unsubscribe"]).toMatch(
      /^<https:\/\/jobify\.test\/api\/email\/unsubscribe\?token=.+>$/,
    );
    expect(await logOf(n.id)).toMatchObject({ status: "SENT", providerId: "id-1" });

    // A duplicate job does nothing.
    expect(await sendNotificationEmail({ prisma, mailer, config }, n.id)).toEqual({
      outcome: "duplicate",
    });
    expect(mailer.send).toHaveBeenCalledTimes(1);
  });

  it("sends only one email when two workers race for the same notification", async () => {
    const n = await notificationFor();
    const { mailer } = fakeMailer();
    const results = await Promise.all([
      sendNotificationEmail({ prisma, mailer, config }, n.id),
      sendNotificationEmail({ prisma, mailer, config }, n.id),
    ]);
    expect(results.filter((r) => r.outcome === "sent")).toHaveLength(1);
    expect(mailer.send).toHaveBeenCalledTimes(1);
  });

  it("skips types the user turned off", async () => {
    const n = await notificationFor();
    await prisma.emailPreference.create({
      data: { userId: n.userId, type: n.type, enabled: false },
    });
    const { mailer } = fakeMailer();
    expect(await sendNotificationEmail({ prisma, mailer, config }, n.id)).toEqual({
      outcome: "skipped",
      reason: "Turned off in settings",
    });
    expect(mailer.send).not.toHaveBeenCalled();
    expect(await logOf(n.id)).toMatchObject({ status: "SKIPPED" });
  });

  it("never emails demo accounts through a real provider, but does into Mailpit", async () => {
    const real = await notificationFor({ isDemo: true });
    expect(
      await sendNotificationEmail({ prisma, mailer: fakeMailer("brevo").mailer, config }, real.id),
    ).toMatchObject({ outcome: "skipped", reason: "Demo account (made-up address)" });

    const local = await notificationFor({ isDemo: true });
    expect(
      await sendNotificationEmail({ prisma, mailer: fakeMailer("smtp").mailer, config }, local.id),
    ).toMatchObject({ outcome: "sent" });
  });

  it("skips types the role doesn't get, and everything when email is off", async () => {
    const wrongRole = await notificationFor({ type: "APPLICATION_SUBMITTED" });
    expect(
      await sendNotificationEmail({ prisma, mailer: fakeMailer().mailer, config }, wrongRole.id),
    ).toMatchObject({ outcome: "skipped", reason: "Not an email type for this role" });

    const off = await notificationFor();
    expect(
      await sendNotificationEmail(
        { prisma, mailer: fakeMailer().mailer, config: { ...config, enabled: false } },
        off.id,
      ),
    ).toMatchObject({ outcome: "skipped" });
  });

  it("retries after a failed send, and records a final failure", async () => {
    const n = await notificationFor();
    const failing: Mailer = {
      provider: "smtp",
      send: vi.fn(async () => {
        throw new Error("SMTP down");
      }),
    };
    await expect(sendNotificationEmail({ prisma, mailer: failing, config }, n.id)).rejects.toThrow(
      "SMTP down",
    );
    expect(await logOf(n.id)).toMatchObject({ status: "SENDING" });

    // BullMQ's retry: the claim is ours, so it goes ahead.
    const { mailer } = fakeMailer();
    expect(
      await sendNotificationEmail({ prisma, mailer, config }, n.id, { retry: true }),
    ).toMatchObject({ outcome: "sent" });

    const other = await notificationFor();
    await expect(
      sendNotificationEmail({ prisma, mailer: failing, config }, other.id),
    ).rejects.toThrow();
    await markEmailFailed(prisma, other.id, "SMTP down");
    expect(await logOf(other.id)).toMatchObject({ status: "FAILED", reason: "SMTP down" });
  });

  it("ignores notifications that no longer exist", async () => {
    expect(
      await sendNotificationEmail({ prisma, mailer: fakeMailer().mailer, config }, "missing-id"),
    ).toEqual({ outcome: "missing" });
  });
});

describe("enqueueEmails", () => {
  it("adds one job per notification, keyed by its id", async () => {
    const addBulk = vi.fn(async () => []);
    await enqueueEmails({ addBulk } as never, ["n1", "n2"]);
    expect(addBulk).toHaveBeenCalledWith([
      expect.objectContaining({
        data: { notificationId: "n1" },
        opts: expect.objectContaining({ jobId: "n1", attempts: 3 }),
      }),
      expect.objectContaining({ data: { notificationId: "n2" } }),
    ]);
  });
});

// Real SMTP into Mailpit (docker-compose locally, a service container in CI).
const MAILPIT = "http://localhost:8025";

describe("through Mailpit", () => {
  it("delivers the email with its headers", async (ctx) => {
    const up = await fetch(`${MAILPIT}/api/v1/info`)
      .then((r) => r.ok)
      .catch(() => false);
    if (!up) ctx.skip();

    const n = await notificationFor();
    const mailer = smtpMailer(env.SMTP_URL, "Jobify <no-reply@jobify.local>");
    await sendNotificationEmail({ prisma, mailer, config }, n.id);

    const to = (await prisma.user.findUniqueOrThrow({ where: { id: n.userId } })).email;
    const search = await fetch(
      `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`,
    );
    const { messages } = (await search.json()) as { messages: { ID: string; Subject: string }[] };
    expect(messages[0]?.Subject).toBe("Skill test for QA Engineer");

    const headers = (await (
      await fetch(`${MAILPIT}/api/v1/message/${messages[0]!.ID}/headers`)
    ).json()) as Record<string, string[]>;
    expect(headers["List-Unsubscribe-Post"]).toEqual(["List-Unsubscribe=One-Click"]);
  });
});
