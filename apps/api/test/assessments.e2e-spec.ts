import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { setupApp } from "../src/app.setup";
import { PrismaService } from "../src/prisma/prisma.service";
import { uniqueRun } from "./helpers";

const run = uniqueRun();
const email = (name: string) => `${name}.${run}@mcq-e2e.test`;
const password = "Password123";
const PDF = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");
const contact = { fullName: "Test Taker", email: "taker@example.com", phone: "+880 1700 000000" };
const test = {
  title: "Frontend basics",
  timeLimitMin: 10,
  questions: [
    {
      prompt: "Which hook stores state?",
      options: ["useMemo", "useState", "useRef"],
      correctIndex: 1,
    },
    { prompt: "HTTP status for Not Found?", options: ["404", "500"], correctIndex: 0 },
  ],
};

describe("Skill tests (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let boss: request.Agent;
  let outsider: request.Agent;
  let jobId: string;

  const signUp = async (name: string, role: "SEEKER" | "EMPLOYER") => {
    const agent = request.agent(app.getHttpServer());
    await agent
      .post("/api/auth/register")
      .send({ fullName: `${name} T`, email: email(name), password, role })
      .expect(201);
    return agent;
  };
  const seekerWhoApplied = async (name: string, toJob = jobId) => {
    const agent = await signUp(name, "SEEKER");
    await agent.post("/api/me/cv").attach("file", PDF, "cv.pdf").expect(201);
    const res = await agent.post(`/api/jobs/${toJob}/applications`).send({ contact }).expect(201);
    return { agent, applicationId: res.body.id as string };
  };
  const postJob = async (title: string) =>
    (
      await boss
        .post("/api/jobs")
        .send({
          title,
          type: "FULL_TIME",
          workplace: "REMOTE",
          country: "Bangladesh",
          salaryMin: 1,
          salaryMax: 2,
          description: "A job with a skill test, used by the e2e suite.",
        })
        .expect(201)
    ).body.id as string;

  beforeAll(async () => {
    process.env.THROTTLE_DISABLED = "true";
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    setupApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    boss = await signUp("boss", "EMPLOYER");
    await boss
      .post("/api/companies")
      .send({ name: `MCQ Co ${run}` })
      .expect(201);
    outsider = await signUp("outsider", "EMPLOYER");
    await outsider
      .post("/api/companies")
      .send({ name: `MCQ Other ${run}` })
      .expect(201);
    jobId = await postJob(`MCQ ${run} role`);
  });

  afterAll(async () => {
    await prisma.company.deleteMany({ where: { name: { contains: run } } });
    await prisma.user.deleteMany({ where: { email: { endsWith: "@mcq-e2e.test" } } });
    await app.close();
  });

  describe("building the test", () => {
    it("validates and saves the test for the hiring team only", async () => {
      await boss
        .put(`/api/jobs/${jobId}/assessment`)
        .send({ ...test, questions: [{ prompt: "Broken?", options: ["a"], correctIndex: 0 }] })
        .expect(400);
      await outsider.put(`/api/jobs/${jobId}/assessment`).send(test).expect(403);
      const res = await boss.put(`/api/jobs/${jobId}/assessment`).send(test).expect(200);
      expect(res.body).toMatchObject({
        title: test.title,
        timeLimitMin: 10,
        locked: false,
        stats: { started: 0, submitted: 0 },
      });
      expect(res.body.questions.map((q: { correctIndex: number }) => q.correctIndex)).toEqual([
        1, 0,
      ]);
      await outsider.get(`/api/jobs/${jobId}/assessment`).expect(403);
    });

    it("marks the job as having a test", async () => {
      const job = await boss.get(`/api/jobs/${jobId}`).expect(200);
      expect(job.body.hasAssessment).toBe(true);
    });
  });

  describe("taking the test", () => {
    let seeker: request.Agent;
    let applicationId: string;
    let attemptId: string;
    let questionIds: string[];

    beforeAll(async () => {
      ({ agent: seeker, applicationId } = await seekerWhoApplied("taker"));
    });

    it("starts an attempt without exposing the answer key", async () => {
      const res = await seeker.post(`/api/me/applications/${applicationId}/attempt`).expect(201);
      attemptId = res.body.id;
      questionIds = res.body.questions.map((q: { id: string }) => q.id);
      expect(JSON.stringify(res.body)).not.toContain("correctIndex");
      expect(res.body).toMatchObject({
        submittedAt: null,
        score: null,
        answers: null,
        timeLimitMin: 10,
      });
      expect(Date.parse(res.body.deadline) - Date.parse(res.body.startedAt)).toBe(10 * 60_000);

      const again = await seeker.post(`/api/me/applications/${applicationId}/attempt`).expect(201);
      expect(again.body.id).toBe(attemptId);
    });

    it("grades on the server and only once", async () => {
      const res = await seeker
        .post(`/api/attempts/${attemptId}/submit`)
        .send({
          answers: [
            { questionId: questionIds[0], optionIndex: 1 },
            { questionId: questionIds[1], optionIndex: 1 },
          ],
        })
        .expect(200);
      expect(res.body).toMatchObject({
        score: 50,
        answers: { [questionIds[0]!]: 1, [questionIds[1]!]: 1 },
      });
      await seeker.post(`/api/attempts/${attemptId}/submit`).send({ answers: [] }).expect(409);
    });

    it("shows the score to the team and locks the test", async () => {
      const applicants = await boss.get(`/api/jobs/${jobId}/applications?sort=score`).expect(200);
      expect(applicants.body[0].test).toEqual({ state: "SUBMITTED", score: 50 });
      await boss.put(`/api/jobs/${jobId}/assessment`).send(test).expect(409);
      const team = await boss.get(`/api/jobs/${jobId}/assessment`).expect(200);
      expect(team.body).toMatchObject({
        locked: true,
        stats: { started: 1, submitted: 1, averageScore: 50 },
      });
      await boss.delete(`/api/jobs/${jobId}/assessment`).expect(409);
    });

    it("keeps other people out of the attempt", async () => {
      const other = await signUp("snoop", "SEEKER");
      await other.post(`/api/me/applications/${applicationId}/attempt`).expect(404);
      await other.post(`/api/attempts/${attemptId}/submit`).send({ answers: [] }).expect(404);
    });
  });

  describe("time limits and eligibility", () => {
    it("closes a late attempt with a score of 0", async () => {
      const { agent, applicationId } = await seekerWhoApplied("slow");
      const attempt = await agent.post(`/api/me/applications/${applicationId}/attempt`).expect(201);
      await prisma.attempt.update({
        where: { id: attempt.body.id },
        data: { startedAt: new Date(Date.now() - 2 * 3_600_000) },
      });
      const res = await agent
        .post(`/api/attempts/${attempt.body.id}/submit`)
        .send({ answers: [] })
        .expect(409);
      expect(res.body.message).toMatch(/Time ran out/);
      const resumed = await agent.post(`/api/me/applications/${applicationId}/attempt`).expect(201);
      expect(resumed.body).toMatchObject({ score: 0 });
      expect(resumed.body.submittedAt).not.toBeNull();
    });

    it("only opens the test while the application is in TESTING", async () => {
      const { agent, applicationId } = await seekerWhoApplied("quitter");
      await agent.delete(`/api/me/applications/${applicationId}`).expect(200);
      await agent.post(`/api/me/applications/${applicationId}/attempt`).expect(403);
    });

    it("404s for jobs without a test, and lets an untouched test be removed", async () => {
      const plainJob = await postJob(`MCQ ${run} plain`);
      const { agent, applicationId } = await seekerWhoApplied("plain", plainJob);
      await agent.post(`/api/me/applications/${applicationId}/attempt`).expect(404);

      const fresh = await postJob(`MCQ ${run} fresh`);
      await boss.put(`/api/jobs/${fresh}/assessment`).send(test).expect(200);
      await boss.delete(`/api/jobs/${fresh}/assessment`).expect(204);
      await boss.get(`/api/jobs/${fresh}/assessment`).expect(404);
    });
  });
});
