import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { setupApp } from "../src/app.setup";
import { PrismaService } from "../src/prisma/prisma.service";
import { uniqueRun } from "./helpers";

const run = uniqueRun();
const email = (name: string) => `${name}.${run}@apps-e2e.test`;
const password = "Password123";
const PDF = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");
const contact = {
  fullName: "Applicant Person",
  email: "applicant@example.com",
  phone: "+880 1700 000000",
};

describe("Applications (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let boss: request.Agent;
  let bossId: string;
  let outsider: request.Agent;
  let seeker: request.Agent;
  let seekerId: string;
  let jobId: string;
  let testJobId: string;
  let questionIds: string[];

  const signUp = async (name: string, role: "SEEKER" | "EMPLOYER") => {
    const agent = request.agent(app.getHttpServer());
    const res = await agent
      .post("/api/auth/register")
      .send({ fullName: `${name} P`, email: email(name), password, role })
      .expect(201);
    return { agent, id: res.body.id as string };
  };
  const postJob = (overrides: Record<string, unknown> = {}) =>
    boss
      .post("/api/jobs")
      .send({
        title: `Apps ${run} Engineer`,
        type: "FULL_TIME",
        workplace: "REMOTE",
        country: "Bangladesh",
        salaryMin: 1000,
        salaryMax: 2000,
        description: "A job used by the applications end-to-end tests, long enough.",
        screeningQuestions: [
          { prompt: "Are you authorized to work here?", kind: "YES_NO", required: true },
          { prompt: "Years of experience?", kind: "NUMBER", required: true },
        ],
        ...overrides,
      })
      .expect(201);
  const answers = () => [
    { questionId: questionIds[0]!, answer: "Yes" },
    { questionId: questionIds[1]!, answer: "4" },
  ];

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
      .send({ name: `Apps Co ${run}` })
      .expect(201);
    outsider = (await signUp("outsider", "EMPLOYER")).agent;
    await outsider
      .post("/api/companies")
      .send({ name: `Apps Other ${run}` })
      .expect(201);
    ({ agent: seeker, id: seekerId } = await signUp("seeker", "SEEKER"));

    const job = await postJob();
    jobId = job.body.id;
    questionIds = job.body.screeningQuestions.map((q: { id: string }) => q.id);
    const testJob = await postJob({ title: `Apps ${run} Tested`, screeningQuestions: [] });
    testJobId = testJob.body.id;
    await prisma.assessment.create({
      data: {
        jobId: testJobId,
        kind: "MCQ",
        title: "Test",
        mcqQuestions: {
          create: [{ prompt: "2+2?", options: ["3", "4"], correctIndex: 1, position: 0 }],
        },
      },
    });
  });

  afterAll(async () => {
    await prisma.company.deleteMany({ where: { name: { contains: run } } });
    await prisma.user.deleteMany({ where: { email: { endsWith: "@apps-e2e.test" } } });
    await app.close();
  });

  describe("applying", () => {
    it("needs a CV", async () => {
      const res = await seeker
        .post(`/api/jobs/${jobId}/applications`)
        .send({ contact, answers: answers() })
        .expect(422);
      expect(res.body.message).toMatch(/CV/);
    });

    it("checks screening answers and reports them per question", async () => {
      await seeker.post("/api/me/cv").attach("file", PDF, "cv.pdf").expect(201);
      const res = await seeker
        .post(`/api/jobs/${jobId}/applications`)
        .send({ contact, answers: [{ questionId: questionIds[0], answer: "maybe" }] })
        .expect(400);
      expect(res.body.details).toEqual({
        [questionIds[0]!]: "Answer yes or no",
        [questionIds[1]!]: "This question needs an answer",
      });
    });

    it("applies, snapshots the CV and notifies the poster", async () => {
      const res = await seeker
        .post(`/api/jobs/${jobId}/applications`)
        .send({ contact, answers: answers() })
        .expect(201);
      expect(res.body).toMatchObject({
        stage: "APPLIED",
        job: { id: jobId },
        test: { state: null },
        history: [{ from: null, to: "APPLIED" }],
      });

      const application = await prisma.application.findFirstOrThrow({
        where: { jobId, seekerId },
        include: { answers: true },
      });
      const profile = await prisma.seekerProfile.findUniqueOrThrow({ where: { userId: seekerId } });
      expect(application.cvKey).not.toBe(profile.cvKey);
      expect(application.answers.map((a) => a.answer).sort()).toEqual(["4", "yes"]);

      const notification = await prisma.notification.findFirst({
        where: { userId: bossId, type: "APPLICATION_SUBMITTED" },
      });
      expect(notification?.payload).toMatchObject({ jobId, applicant: contact.fullName });
    });

    it("keeps the application's CV when the profile CV is replaced", async () => {
      await seeker.post("/api/me/cv").attach("file", PDF, "new.pdf").expect(201);
      const applicants = await boss.get(`/api/jobs/${jobId}/applications`).expect(200);
      const cv = await boss.get(applicants.body[0].cvUrl).expect(302);
      expect((await fetch(cv.headers.location!)).status).toBe(200);
    });

    it("rejects duplicates, closed jobs and age-ineligible seekers", async () => {
      await seeker
        .post(`/api/jobs/${jobId}/applications`)
        .send({ contact, answers: answers() })
        .expect(409);

      const closed = await postJob({ title: `Apps ${run} Closed`, screeningQuestions: [] });
      await boss.patch(`/api/jobs/${closed.body.id}`).send({ status: "CLOSED" }).expect(200);
      await seeker.post(`/api/jobs/${closed.body.id}/applications`).send({ contact }).expect(404);

      const young = await postJob({
        title: `Apps ${run} Young`,
        screeningQuestions: [],
        ageMax: 25,
      });
      await seeker.patch("/api/me/profile").send({ birthdate: "1980-01-01" }).expect(200);
      await seeker.post(`/api/jobs/${young.body.id}/applications`).send({ contact }).expect(403);
    });

    it("starts at TESTING when the job has a skill test, and tells the seeker", async () => {
      const res = await seeker
        .post(`/api/jobs/${testJobId}/applications`)
        .send({ contact })
        .expect(201);
      expect(res.body).toMatchObject({
        stage: "TESTING",
        test: { state: "NOT_STARTED", score: null },
      });
      const notification = await prisma.notification.findFirst({
        where: { userId: seekerId, type: "ASSESSMENT_ASSIGNED" },
      });
      expect(notification?.payload).toMatchObject({ jobId: testJobId });
    });

    it("lists the seeker's applications with counts", async () => {
      const res = await seeker.get("/api/me/applications").expect(200);
      expect(res.body.items).toHaveLength(2);
      expect(res.body.counts).toMatchObject({ APPLIED: 1, TESTING: 1, REJECTED: 0 });
    });
  });

  describe("reviewing", () => {
    let applicationId: string;

    it("shows applicants only to the hiring company, with answers and profile details", async () => {
      await outsider.get(`/api/jobs/${jobId}/applications`).expect(403);
      await seeker.get(`/api/jobs/${jobId}/applications`).expect(403);
      const res = await boss.get(`/api/jobs/${jobId}/applications`).expect(200);
      applicationId = res.body[0].id;
      expect(res.body[0]).toMatchObject({
        stage: "APPLIED",
        contact,
        seeker: { id: seekerId, fullName: "seeker P" },
        answers: expect.arrayContaining([
          expect.objectContaining({ prompt: "Years of experience?", answer: "4" }),
        ]),
      });
    });

    it("moves applicants through allowed stages, notifying the seeker", async () => {
      await boss
        .patch(`/api/applications/${applicationId}/stage`)
        .send({ stage: "OFFER" })
        .expect(409);
      const res = await boss
        .patch(`/api/applications/${applicationId}/stage`)
        .send({ stage: "SHORTLISTED", note: "Strong CV" })
        .expect(200);
      expect(res.body.stage).toBe("SHORTLISTED");
      expect(res.body.history.at(-1)).toMatchObject({
        from: "APPLIED",
        to: "SHORTLISTED",
        note: "Strong CV",
      });

      const notification = await prisma.notification.findFirst({
        where: { userId: seekerId, type: "APPLICATION_STAGE_CHANGED" },
      });
      expect(notification?.payload).toMatchObject({ stage: "SHORTLISTED" });
      await outsider
        .patch(`/api/applications/${applicationId}/stage`)
        .send({ stage: "REJECTED" })
        .expect(403);
    });

    it("filters and sorts applicants", async () => {
      const shortlisted = await boss
        .get(`/api/jobs/${jobId}/applications?stage=SHORTLISTED`)
        .expect(200);
      expect(shortlisted.body).toHaveLength(1);
      expect(
        (await boss.get(`/api/jobs/${jobId}/applications?stage=REJECTED`).expect(200)).body,
      ).toHaveLength(0);
      await boss.get(`/api/jobs/${jobId}/applications?sort=score`).expect(200);
    });
  });

  describe("withdrawing", () => {
    it("lets the seeker withdraw once, after which the team can't move it", async () => {
      const app2 = await prisma.application.findFirstOrThrow({
        where: { jobId: testJobId, seekerId },
      });
      const res = await seeker.delete(`/api/me/applications/${app2.id}`).expect(200);
      expect(res.body.stage).toBe("WITHDRAWN");
      await seeker.delete(`/api/me/applications/${app2.id}`).expect(409);
      await boss
        .patch(`/api/applications/${app2.id}/stage`)
        .send({ stage: "SHORTLISTED" })
        .expect(409);
    });
  });
});

describe("Applicants with incomplete stored contact (e2e)", () => {
  it("are listed with gaps filled from the account instead of failing the whole list", async () => {
    process.env.THROTTLE_DISABLED = "true";
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const app = moduleRef.createNestApplication({ logger: false });
    setupApp(app);
    await app.init();
    const prisma = app.get(PrismaService);
    const tag = uniqueRun();
    const boss = request.agent(app.getHttpServer());
    await boss
      .post("/api/auth/register")
      .send({
        fullName: "Legacy Boss",
        email: `boss.${tag}@legacy-e2e.test`,
        password: "Password123",
        role: "EMPLOYER",
      })
      .expect(201);
    await boss
      .post("/api/companies")
      .send({ name: `Legacy Co ${tag}` })
      .expect(201);
    const job = await boss
      .post("/api/jobs")
      .send({
        title: "Legacy role",
        type: "FULL_TIME",
        workplace: "REMOTE",
        country: "Bangladesh",
        salaryMin: 1,
        salaryMax: 2,
        description: "A job with an application stored in an older shape.",
      })
      .expect(201);
    const seeker = await prisma.user.create({
      data: {
        email: `seeker.${tag}@legacy-e2e.test`,
        role: "SEEKER",
        seekerProfile: { create: { fullName: "Old Applicant" } },
      },
    });
    await prisma.application.create({
      data: {
        jobId: job.body.id,
        seekerId: seeker.id,
        cvKey: "users/x/cv/00000000-0000-0000-0000-000000000000.pdf",
        contact: { phone: "1" },
      },
    });

    const res = await boss.get(`/api/jobs/${job.body.id}/applications`).expect(200);
    expect(res.body[0].contact).toEqual({
      fullName: "Old Applicant",
      email: `seeker.${tag}@legacy-e2e.test`,
      phone: "1",
    });

    await prisma.company.deleteMany({ where: { name: { contains: tag } } });
    await prisma.user.deleteMany({ where: { email: { endsWith: "@legacy-e2e.test" } } });
    await app.close();
  });
});
