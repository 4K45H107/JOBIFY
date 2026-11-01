import { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { unsubscribeToken } from "@jobify/email/tokens";
import { EMAIL_QUEUE } from "@jobify/shared";
import { Queue } from "bullmq";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { setupApp } from "../src/app.setup";
import { NotificationsService } from "../src/notifications/notifications.service";
import { PrismaService } from "../src/prisma/prisma.service";
import { uniqueRun } from "./helpers";

const run = uniqueRun();
const email = (name: string) => `${name}.${run}@email-e2e.test`;

describe("Email preferences and unsubscribe (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let seeker: request.Agent;
  let seekerId: string;
  /** The API loads .env on start, so read the secret from its config, after init. */
  let secret: string;

  beforeAll(async () => {
    process.env.THROTTLE_DISABLED = "true";
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    setupApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    secret = app.get(ConfigService).getOrThrow("JWT_ACCESS_SECRET");
    seeker = request.agent(app.getHttpServer());
    const res = await seeker
      .post("/api/auth/register")
      .send({
        fullName: "Mail Seeker",
        email: email("seeker"),
        password: "Password123",
        role: "SEEKER",
      })
      .expect(201);
    seekerId = res.body.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { endsWith: "@email-e2e.test" } } });
    await app.close();
  });

  it("lists the role's email types, all on by default", async () => {
    const res = await seeker.get("/api/me/email-preferences").expect(200);
    expect(res.body.preferences.map((p: { type: string }) => p.type)).toEqual([
      "APPLICATION_STAGE_CHANGED",
      "ASSESSMENT_ASSIGNED",
      "INTERVIEW_SCHEDULED",
      "INTERVIEW_REMINDER",
    ]);
    expect(res.body.preferences.every((p: { enabled: boolean }) => p.enabled)).toBe(true);
  });

  it("saves choices, and rejects types the role doesn't get", async () => {
    const res = await seeker
      .put("/api/me/email-preferences")
      .send({ preferences: [{ type: "INTERVIEW_REMINDER", enabled: false }] })
      .expect(200);
    const reminder = res.body.preferences.find(
      (p: { type: string }) => p.type === "INTERVIEW_REMINDER",
    );
    expect(reminder.enabled).toBe(false);

    await seeker
      .put("/api/me/email-preferences")
      .send({ preferences: [{ type: "APPLICATION_SUBMITTED", enabled: false }] })
      .expect(400);
    await request(app.getHttpServer()).get("/api/me/email-preferences").expect(401);
  });

  it("unsubscribes with a signed link, without signing in", async () => {
    const token = unsubscribeToken(seekerId, "ASSESSMENT_ASSIGNED", secret);
    const res = await request(app.getHttpServer())
      .post("/api/email/unsubscribe")
      .send({ token })
      .expect(200);
    expect(res.body).toEqual({ label: "Skill tests" });

    // Mail apps' one-click unsubscribe: token in the query string, no body.
    const oneClick = unsubscribeToken(seekerId, "INTERVIEW_SCHEDULED", secret);
    await request(app.getHttpServer()).post(`/api/email/unsubscribe?token=${oneClick}`).expect(200);

    const prefs = await seeker.get("/api/me/email-preferences").expect(200);
    const off = prefs.body.preferences
      .filter((p: { enabled: boolean }) => !p.enabled)
      .map((p: { type: string }) => p.type);
    expect(off).toEqual(["ASSESSMENT_ASSIGNED", "INTERVIEW_SCHEDULED", "INTERVIEW_REMINDER"]);
  });

  it("rejects forged or broken unsubscribe links", async () => {
    const forged = unsubscribeToken(seekerId, "ASSESSMENT_ASSIGNED", "x".repeat(40));
    await request(app.getHttpServer())
      .post("/api/email/unsubscribe")
      .send({ token: forged })
      .expect(400);
    await request(app.getHttpServer()).post("/api/email/unsubscribe").expect(400);
  });

  it("queues an email job for each new notification", async () => {
    if (!process.env.REDIS_URL) return;
    await app.get(NotificationsService).notify([seekerId], "APPLICATION_STAGE_CHANGED", {
      jobTitle: "QA",
      company: "Acme",
      stage: "SHORTLISTED",
    });
    const row = await prisma.notification.findFirstOrThrow({
      where: { userId: seekerId, type: "APPLICATION_STAGE_CHANGED" },
    });
    const queue = new Queue(EMAIL_QUEUE, { connection: { url: process.env.REDIS_URL } });
    try {
      const job = await queue.getJob(row.id);
      // A running dev worker may already be sending it, so only check it was queued.
      expect(job?.data).toEqual({ notificationId: row.id });
    } finally {
      await queue.close();
    }
  });
});
