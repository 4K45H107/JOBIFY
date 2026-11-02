import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { Dashboard } from "@jobify/shared";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { setupApp } from "../src/app.setup";
import { PrismaService } from "../src/prisma/prisma.service";
import { markVerified, uniqueRun } from "./helpers";

const run = uniqueRun();
const email = (name: string) => `${name}.${run}@dashboard-e2e.test`;
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);

const stats = (body: Dashboard) => Object.fromEntries(body.stats.map((s) => [s.key, s.value]));
const series = (body: Dashboard, key: string) =>
  body.series.find((s) => s.key === key)!.points.map((p) => p.value);

describe("Dashboard (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let boss: request.Agent;
  let seeker: request.Agent;
  let other: request.Agent;

  const signUp = async (name: string, role: "SEEKER" | "EMPLOYER") => {
    const agent = request.agent(app.getHttpServer());
    const res = await agent
      .post("/api/auth/register")
      .send({ fullName: `${name} P`, email: email(name), password: "Password123", role })
      .expect(201);
    await markVerified(app, email(name));
    return { agent, id: res.body.id as string };
  };

  beforeAll(async () => {
    process.env.THROTTLE_DISABLED = "true";
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    setupApp(app);
    await app.init();
    prisma = app.get(PrismaService);

    const bossUser = await signUp("boss", "EMPLOYER");
    boss = bossUser.agent;
    await boss
      .post("/api/companies")
      .send({ name: `Dash Co ${run}` })
      .expect(201);
    const seekerUser = await signUp("seeker", "SEEKER");
    seeker = seekerUser.agent;
    // Another seeker applying to the same company, so the employer sees more than one person.
    const otherUser = await signUp("other", "SEEKER");
    other = otherUser.agent;

    const postJob = async (title: string) =>
      (
        await boss
          .post("/api/jobs")
          .send({
            title: `${title} ${run}`,
            type: "FULL_TIME",
            workplace: "REMOTE",
            country: "Bangladesh",
            salaryMin: 1000,
            salaryMax: 2000,
            description: "A job used by the dashboard end-to-end tests, long enough.",
          })
          .expect(201)
      ).body.id as string;
    const jobs = await Promise.all(["Alpha", "Beta", "Gamma", "Delta"].map(postJob));
    await prisma.job.update({ where: { id: jobs[3]! }, data: { status: "CLOSED" } });

    const apply = (jobId: string, seekerId: string, stage: string, createdAt: Date) =>
      prisma.application.create({
        data: {
          jobId,
          seekerId,
          stage: stage as never,
          createdAt,
          cvKey: "cv/test.pdf",
          contact: { fullName: "X", email: "x@example.com", phone: "1" },
        },
      });
    // Seeker: applied today and 2 days ago, one at interview, one rejected after an
    // interview, and one from long ago that's outside the chart.
    const [, interviewing, rejected] = await Promise.all([
      apply(jobs[0]!, seekerUser.id, "APPLIED", daysAgo(0)),
      apply(jobs[1]!, seekerUser.id, "INTERVIEW", daysAgo(2)),
      apply(jobs[2]!, seekerUser.id, "REJECTED", daysAgo(2)),
      apply(jobs[3]!, seekerUser.id, "OFFER", daysAgo(40)),
      apply(jobs[0]!, otherUser.id, "SHORTLISTED", daysAgo(1)),
    ]);
    const interview = (applicationId: string, scheduledAt: Date, status = "SCHEDULED") =>
      prisma.interview.create({
        data: {
          applicationId,
          createdById: bossUser.id,
          stage: "Round 1",
          scheduledAt,
          durationMin: 30,
          status: status as never,
          roomName: `dash-${run}-${applicationId}-${status}`,
        },
      });
    await Promise.all([
      interview(interviewing.id, new Date(Date.now() + DAY)),
      interview(rejected.id, daysAgo(1), "COMPLETED"),
      interview(rejected.id, daysAgo(1), "CANCELLED"),
    ]);
    await prisma.savedJob.create({ data: { userId: seekerUser.id, jobId: jobs[0]! } });
    await prisma.jobView.create({
      data: { userId: seekerUser.id, jobId: jobs[1]!, viewedAt: daysAgo(0) },
    });
  });

  afterAll(async () => {
    await prisma.company.deleteMany({ where: { name: { contains: run } } });
    await prisma.user.deleteMany({ where: { email: { endsWith: "@dashboard-e2e.test" } } });
    await app.close();
  });

  it("counts a seeker's applications and charts them per day", async () => {
    const res = await seeker.get("/api/me/dashboard?range=week&tz=UTC").expect(200);
    const body = res.body as Dashboard;
    expect(stats(body)).toEqual({
      applications: 4,
      interviewed: 3, // at interview, rejected after one, and the offer
      ongoing: 2,
      offers: 1,
      rejected: 1,
      upcoming: 1,
    });
    expect(series(body, "applications")).toEqual([0, 0, 0, 0, 2, 0, 1]);
    expect(series(body, "views")).toEqual([0, 0, 0, 0, 0, 0, 1]);
    expect(body.series[0]!.points).toHaveLength(7);
  });

  it("charts 30 days for the month range", async () => {
    const res = await seeker.get("/api/me/dashboard?range=month&tz=Asia/Dhaka").expect(200);
    expect((res.body as Dashboard).series[0]!.points).toHaveLength(30);
  });

  it("counts the employer's whole company", async () => {
    const res = await boss.get("/api/me/dashboard?tz=UTC").expect(200);
    const body = res.body as Dashboard;
    expect(stats(body)).toEqual({
      openJobs: 3,
      applicants: 5,
      interviewed: 3,
      ongoing: 3,
      offers: 1,
      upcoming: 1,
    });
    expect(series(body, "applicants")).toEqual([0, 0, 0, 0, 2, 1, 1]);
    // The completed interview yesterday; cancelled and future ones don't count.
    expect(series(body, "interviews")).toEqual([0, 0, 0, 0, 0, 1, 0]);
  });

  it("keeps people to their own numbers", async () => {
    const res = await other.get("/api/me/dashboard?tz=UTC").expect(200);
    expect(stats(res.body as Dashboard)).toMatchObject({ applications: 1, ongoing: 1 });

    const loner = (await signUp("loner", "EMPLOYER")).agent;
    await loner.get("/api/me/dashboard").expect(404);
    await request(app.getHttpServer()).get("/api/me/dashboard").expect(401);
  });

  it("rejects unknown ranges and time zones", async () => {
    await seeker.get("/api/me/dashboard?tz=Mars/Olympus").expect(400);
    await seeker.get("/api/me/dashboard?range=year").expect(400);
  });

  it("lets employers search their company's jobs by title", async () => {
    const res = await boss.get(`/api/employer/jobs?q=beta ${run}`).expect(200);
    expect(res.body.items.map((j: { title: string }) => j.title)).toEqual([`Beta ${run}`]);
  });
});
