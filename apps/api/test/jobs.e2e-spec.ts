import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { setupApp } from "../src/app.setup";
import { PrismaService } from "../src/prisma/prisma.service";

const run = Date.now().toString(36);
const email = (name: string) => `${name}.${run}@jobs-e2e.test`;
const password = "Password123";
const token = `Zq${run}`; // unique word to isolate this run's jobs in searches

const baseJob = {
  title: `${token} Frontend Developer`,
  type: "FULL_TIME",
  workplace: "HYBRID",
  country: "Bangladesh",
  city: "Dhaka",
  salaryMin: 60000,
  salaryMax: 90000,
  description: "Build accessible, fast interfaces with React and TypeScript for millions of users.",
  skills: ["React", `${token}Lang`],
  screeningQuestions: [
    { prompt: "Are you allowed to work in Bangladesh?", kind: "YES_NO", required: true },
  ],
};

describe("Jobs (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let boss: request.Agent;
  let colleague: request.Agent;
  let outsider: request.Agent;
  let seeker: request.Agent;
  let seekerId: string;
  let bossId: string;
  let jobId: string;

  const signUp = async (name: string, role: "SEEKER" | "EMPLOYER") => {
    const agent = request.agent(app.getHttpServer());
    const res = await agent
      .post("/api/auth/register")
      .send({ fullName: `${name} X`, email: email(name), password, role })
      .expect(201);
    return { agent, id: res.body.id as string };
  };
  const createJob = (agent: request.Agent, overrides: Record<string, unknown> = {}) =>
    agent.post("/api/jobs").send({ ...baseJob, ...overrides });
  const search = (query: string) => seeker.get(`/api/jobs?q=${token}&${query}`).expect(200);

  beforeAll(async () => {
    process.env.THROTTLE_DISABLED = "true";
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    setupApp(app);
    await app.init();
    prisma = app.get(PrismaService);

    ({ agent: boss, id: bossId } = await signUp("boss", "EMPLOYER"));
    await boss
      .post("/api/companies")
      .send({ name: `Jobs Co ${run}` })
      .expect(201);
    const { agent: c, id: colleagueId } = await signUp("colleague", "EMPLOYER");
    colleague = c;
    const company = await prisma.company.findFirstOrThrow({ where: { name: `Jobs Co ${run}` } });
    await prisma.companyMember.create({
      data: { companyId: company.id, userId: colleagueId, role: "RECRUITER", status: "ACTIVE" },
    });
    outsider = (await signUp("outsider", "EMPLOYER")).agent;
    await outsider
      .post("/api/companies")
      .send({ name: `Other Co ${run}` })
      .expect(201);
    ({ agent: seeker, id: seekerId } = await signUp("seeker", "SEEKER"));
  });

  afterAll(async () => {
    await prisma.company.deleteMany({ where: { name: { endsWith: run } } });
    await prisma.user.deleteMany({ where: { email: { endsWith: "@jobs-e2e.test" } } });
    await prisma.skill.deleteMany({ where: { name: `${token}Lang` } });
    await app.close();
  });

  describe("posting", () => {
    it("needs a company", async () => {
      const { agent } = await signUp("lonely", "EMPLOYER");
      await createJob(agent).expect(404);
    });

    it("creates a job with skills and screening questions", async () => {
      const res = await createJob(boss).expect(201);
      jobId = res.body.id;
      expect(res.body).toMatchObject({
        title: baseJob.title,
        status: "OPEN",
        canManage: true,
        applicants: 0,
        company: { name: `Jobs Co ${run}` },
        screeningQuestions: [
          { prompt: baseJob.screeningQuestions[0]!.prompt, kind: "YES_NO", required: true },
        ],
      });
      expect(res.body.skills).toEqual(expect.arrayContaining(["React", `${token}Lang`]));
    });

    it("validates salary ranges and keeps seekers out", async () => {
      await createJob(boss, { salaryMax: 1000 }).expect(400);
      await createJob(seeker).expect(403);
    });
  });

  describe("search", () => {
    beforeAll(async () => {
      await createJob(colleague, {
        title: `${token} Backend Engineer`,
        workplace: "REMOTE",
        type: "CONTRACT",
        salaryMin: 90000,
        salaryMax: 150000,
        city: null,
        country: "Germany",
        skills: ["Node.js"],
      }).expect(201);
      await createJob(boss, { title: `${token} Draft Role`, status: "DRAFT" }).expect(201);
      const expired = await createJob(boss, { title: `${token} Expired Role` }).expect(201);
      await prisma.job.update({
        where: { id: expired.body.id },
        data: { deadline: new Date("2020-01-01") },
      });
    });

    it("lists only open, unexpired jobs", async () => {
      const res = await search("");
      expect(res.body.total).toBe(2);
      expect(res.body.items.map((j: { title: string }) => j.title)).not.toContain(
        `${token} Draft Role`,
      );
    });

    it("filters by type, workplace, location, company and salary", async () => {
      expect((await search("type=CONTRACT")).body.total).toBe(1);
      expect((await search("workplace=HYBRID,ONSITE")).body.total).toBe(1);
      expect((await search("location=germany")).body.items[0].title).toContain("Backend");
      expect((await search(`company=jobs co ${run}`)).body.total).toBe(2);
      expect((await search(`companySlug=jobs-co-${run}`)).body.total).toBe(2);
      expect((await search("companySlug=no-such-company")).body.total).toBe(0);
      expect(
        (await search("salary=100000")).body.items.map((j: { title: string }) => j.title),
      ).toEqual([`${token} Backend Engineer`]);
    });

    it("sorts by salary and paginates", async () => {
      const bySalary = await search("sort=salary");
      expect(bySalary.body.items[0].salaryMax).toBe(150000);
      const page2 = await search("pageSize=1&page=2");
      expect(page2.body).toMatchObject({ total: 2, page: 2, pageSize: 1 });
      expect(page2.body.items).toHaveLength(1);
    });

    it("finds jobs by an exact skill name", async () => {
      const res = await seeker.get(`/api/jobs?q=${token}Lang`).expect(200);
      expect(res.body.total).toBeGreaterThanOrEqual(1);
    });

    it("hides drafts from seekers but not from the company", async () => {
      const draft = await prisma.job.findFirstOrThrow({ where: { title: `${token} Draft Role` } });
      await seeker.get(`/api/jobs/${draft.id}`).expect(404);
      await outsider.get(`/api/jobs/${draft.id}`).expect(404);
      await colleague.get(`/api/jobs/${draft.id}`).expect(200);
    });
  });

  it("reports platform stats", async () => {
    const res = await seeker.get("/api/stats").expect(200);
    expect(res.body.openJobs).toBeGreaterThanOrEqual(2);
    expect(res.body.companies).toBeGreaterThanOrEqual(2);
    expect(res.body.seekers).toBeGreaterThanOrEqual(1);
  });

  describe("seeker activity", () => {
    it("records views as recent jobs, newest first", async () => {
      const backend = await prisma.job.findFirstOrThrow({
        where: { title: `${token} Backend Engineer` },
      });
      await seeker.get(`/api/jobs/${jobId}`).expect(200);
      await seeker.get(`/api/jobs/${backend.id}`).expect(200);
      const recent = await seeker.get("/api/me/recent-jobs").expect(200);
      expect(recent.body.slice(0, 2).map((j: { id: string }) => j.id)).toEqual([backend.id, jobId]);
      // Employers' visits are not tracked.
      await boss.get(`/api/jobs/${jobId}`).expect(200);
      expect(await prisma.jobView.count({ where: { userId: bossId } })).toBe(0);
    });

    it("saves and unsaves jobs", async () => {
      await seeker.post(`/api/jobs/${jobId}/save`).expect(204);
      await seeker.post(`/api/jobs/${jobId}/save`).expect(204); // idempotent
      expect(
        (await seeker.get("/api/me/saved-jobs").expect(200)).body.map((j: { id: string }) => j.id),
      ).toEqual([jobId]);
      expect((await search("")).body.items.find((j: { id: string }) => j.id === jobId).saved).toBe(
        true,
      );
      await seeker.delete(`/api/jobs/${jobId}/save`).expect(204);
      expect((await seeker.get("/api/me/saved-jobs").expect(200)).body).toEqual([]);
    });

    it("recommends jobs that fit the seeker, with reasons, and respects age limits", async () => {
      await seeker
        .put("/api/me/skills")
        .send({ skills: ["React"] })
        .expect(200);
      await seeker
        .put("/api/me/preferences")
        .send({
          titles: [`${token} Frontend Developer`],
          locations: ["Dhaka"],
          jobTypes: ["FULL_TIME"],
          workplace: ["HYBRID"],
          minSalary: 50000,
        })
        .expect(200);
      await seeker.patch("/api/me/profile").send({ birthdate: "1995-01-01" }).expect(200);

      const res = await seeker.get("/api/jobs/for-you").expect(200);
      const top = res.body.find((j: { id: string }) => j.id === jobId);
      expect(top.reasons).toEqual(
        expect.arrayContaining([`Matches “${token} Frontend Developer”`, "Uses React", "In Dhaka"]),
      );
      expect(res.body[0].score).toBeGreaterThanOrEqual(top.score);

      await prisma.job.update({ where: { id: jobId }, data: { ageMax: 25 } });
      const after = await seeker.get("/api/jobs/for-you").expect(200);
      expect(after.body.map((j: { id: string }) => j.id)).not.toContain(jobId);
      await prisma.job.update({ where: { id: jobId }, data: { ageMax: null } });
    });

    it("suggests similar jobs", async () => {
      const twin = await createJob(colleague, { title: `${token} Frontend Engineer` }).expect(201);
      const res = await seeker.get(`/api/jobs/${jobId}/similar`).expect(200);
      expect(res.body.map((j: { id: string }) => j.id)).toContain(twin.body.id);
      expect(res.body.map((j: { id: string }) => j.id)).not.toContain(jobId);
    });
  });

  describe("managing", () => {
    it("lets company members edit, but not other companies", async () => {
      await outsider.patch(`/api/jobs/${jobId}`).send({ title: "Hijacked" }).expect(403);
      const res = await colleague
        .patch(`/api/jobs/${jobId}`)
        .send({ title: `${token} Senior Frontend Developer`, skills: ["Vue"] })
        .expect(200);
      expect(res.body).toMatchObject({
        title: `${token} Senior Frontend Developer`,
        skills: ["Vue"],
      });
      await colleague.patch(`/api/jobs/${jobId}`).send({ salaryMin: 999999 }).expect(400);
    });

    it("locks screening questions once someone has applied", async () => {
      await prisma.application.create({ data: { jobId, seekerId, cvKey: "x", contact: {} } });
      await boss.patch(`/api/jobs/${jobId}`).send({ screeningQuestions: [] }).expect(409);
      const detail = await boss.get(`/api/jobs/${jobId}`).expect(200);
      expect(detail.body.applicants).toBe(1);
      expect((await seeker.get(`/api/jobs/${jobId}`).expect(200)).body.applied).toBe(true);
    });

    it("closes a job, which removes it from search, and can't reopen it as a draft", async () => {
      await boss.patch(`/api/jobs/${jobId}`).send({ status: "CLOSED" }).expect(200);
      expect((await search("")).body.items.map((j: { id: string }) => j.id)).not.toContain(jobId);
      await boss.patch(`/api/jobs/${jobId}`).send({ status: "DRAFT" }).expect(409);
    });

    it("lists My Offerings vs My Company Jobs", async () => {
      const mine = await colleague.get("/api/employer/jobs?scope=mine").expect(200);
      const company = await colleague.get("/api/employer/jobs?scope=company").expect(200);
      expect(mine.body.total).toBe(2);
      expect(company.body.total).toBeGreaterThan(mine.body.total);
      const closed = await boss.get("/api/employer/jobs?status=CLOSED").expect(200);
      expect(closed.body.items.map((j: { id: string }) => j.id)).toEqual([jobId]);
    });
  });
});
