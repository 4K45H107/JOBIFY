import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { AccountEmailJob } from "@jobify/shared";
import request from "supertest";
import { vi } from "vitest";
import { AppModule } from "../src/app.module";
import { setupApp } from "../src/app.setup";
import { EmailQueueService } from "../src/email/email-queue.service";
import { PrismaService } from "../src/prisma/prisma.service";
import { uniqueRun } from "./helpers";

const run = uniqueRun();
const email = (name: string) => `${name}.${run}@account-e2e.test`;
const password = "Password123";

describe("Account security (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  /** Account emails the API queued; the raw token is only ever in these. */
  const sent: AccountEmailJob[] = [];
  const lastToken = (kind: AccountEmailJob["kind"], userId: string) =>
    sent.filter((j) => j.kind === kind && j.userId === userId).at(-1)?.token;

  beforeAll(async () => {
    process.env.THROTTLE_DISABLED = "true";
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    setupApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    vi.spyOn(app.get(EmailQueueService), "enqueueAccount").mockImplementation(async (job) => {
      sent.push(job);
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { endsWith: "@account-e2e.test" } } });
    await app.close();
  });

  const register = async (name: string, role: "SEEKER" | "EMPLOYER" = "SEEKER") => {
    const agent = request.agent(app.getHttpServer());
    const res = await agent
      .post("/api/auth/register")
      .send({ fullName: `${name} A`, email: email(name), password, role })
      .expect(201);
    return { agent, id: res.body.id as string };
  };
  const login = (name: string, pw = password) =>
    request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ email: email(name), password: pw });

  describe("email verification", () => {
    it("emails a link at sign-up, and blocks applying and posting until verified", async () => {
      const { agent, id } = await register("verify");
      expect((await agent.get("/api/auth/me").expect(200)).body.emailVerified).toBe(false);
      expect(lastToken("VERIFY_EMAIL", id)).toMatch(/^[\w-]{43}$/);

      const apply = await agent.post("/api/jobs/any-job/applications").send({
        contact: { fullName: "Verify A", email: email("verify"), phone: "01700000000" },
      });
      expect(apply.status).toBe(403);
      expect(apply.body.message).toContain("Verify your email");

      const boss = await register("boss", "EMPLOYER");
      await boss.agent.post("/api/jobs").send({}).expect(400); // validation runs first
      const post = await boss.agent.post("/api/jobs").send({
        title: "QA Engineer",
        type: "FULL_TIME",
        workplace: "REMOTE",
        country: "Bangladesh",
        salaryMin: 60000,
        salaryMax: 90000,
        description: "Test web and mobile releases end to end, and automate what repeats.",
      });
      expect(post.status).toBe(403);
    });

    it("verifies with the link once; reusing or forging it fails", async () => {
      const { agent, id } = await register("link");
      const token = lastToken("VERIFY_EMAIL", id)!;
      // The link works in a browser that isn't signed in.
      await request(app.getHttpServer()).post("/api/auth/email/verify").send({ token }).expect(204);
      expect((await agent.get("/api/auth/me").expect(200)).body.emailVerified).toBe(true);

      await request(app.getHttpServer()).post("/api/auth/email/verify").send({ token }).expect(400);
      await request(app.getHttpServer())
        .post("/api/auth/email/verify")
        .send({ token: "x".repeat(43) })
        .expect(400);

      // Already verified: resending sends nothing.
      const before = sent.length;
      await agent.post("/api/auth/email/resend").expect(204);
      expect(sent.length).toBe(before);
    });

    it("resending replaces the old link, and expired links fail", async () => {
      const { agent, id } = await register("resend");
      const first = lastToken("VERIFY_EMAIL", id)!;
      await agent.post("/api/auth/email/resend").expect(204);
      const second = lastToken("VERIFY_EMAIL", id)!;
      expect(second).not.toBe(first);
      await request(app.getHttpServer())
        .post("/api/auth/email/verify")
        .send({ token: first })
        .expect(400);

      await prisma.authToken.updateMany({
        where: { userId: id, usedAt: null },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });
      await request(app.getHttpServer())
        .post("/api/auth/email/verify")
        .send({ token: second })
        .expect(400);
      await request(app.getHttpServer()).post("/api/auth/email/resend").expect(401);
    });
  });

  describe("forgot and reset password", () => {
    it("answers the same whether or not the account exists", async () => {
      const before = sent.length;
      await request(app.getHttpServer())
        .post("/api/auth/password/forgot")
        .send({ email: email("nobody") })
        .expect(204);
      expect(sent.length).toBe(before);
    });

    it("resets with the emailed link, signs out everywhere, and works once", async () => {
      const { agent, id } = await register("reset");
      await request(app.getHttpServer())
        .post("/api/auth/password/forgot")
        .send({ email: email("reset").toUpperCase() })
        .expect(204);
      const token = lastToken("PASSWORD_RESET", id)!;
      expect(token).toBeTruthy();

      await request(app.getHttpServer())
        .post("/api/auth/password/reset")
        .send({ token, password: "weak" })
        .expect(400);
      await request(app.getHttpServer())
        .post("/api/auth/password/reset")
        .send({ token, password: "NewPassword456" })
        .expect(204);

      await login("reset").expect(401);
      await login("reset", "NewPassword456").expect(200);
      // The old browser session can't refresh any more.
      await agent.post("/api/auth/refresh").expect(401);
      // Opening the emailed link proved the address.
      const user = await prisma.user.findUniqueOrThrow({ where: { id } });
      expect(user.emailVerifiedAt).not.toBeNull();
      expect(sent.at(-1)).toMatchObject({ kind: "PASSWORD_CHANGED", userId: id });

      await request(app.getHttpServer())
        .post("/api/auth/password/reset")
        .send({ token, password: "Another789" })
        .expect(400);
    });
  });

  describe("change password", () => {
    it("needs the current password and keeps this device signed in, not others", async () => {
      const { agent, id } = await register("change");
      const other = request.agent(app.getHttpServer());
      await other
        .post("/api/auth/login")
        .send({ email: email("change"), password })
        .expect(200);

      await agent
        .post("/api/auth/password/change")
        .send({ currentPassword: "Wrong1234", newPassword: "Changed123" })
        .expect(400);
      await agent
        .post("/api/auth/password/change")
        .send({ currentPassword: password, newPassword: password })
        .expect(400);
      await agent
        .post("/api/auth/password/change")
        .send({ currentPassword: password, newPassword: "Changed123" })
        .expect(204);

      await agent.post("/api/auth/refresh").expect(204);
      await other.post("/api/auth/refresh").expect(401);
      await login("change", "Changed123").expect(200);
      expect(sent.at(-1)).toMatchObject({ kind: "PASSWORD_CHANGED", userId: id });
      await request(app.getHttpServer())
        .post("/api/auth/password/change")
        .send({ currentPassword: password, newPassword: "Changed123" })
        .expect(401);
    });
  });
});
