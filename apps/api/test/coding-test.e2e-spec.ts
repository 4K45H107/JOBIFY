import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { setupApp } from "../src/app.setup";
import { getTests } from "../src/coding/library";
import { PrismaService } from "../src/prisma/prisma.service";
import { markVerified, uniqueRun } from "./helpers";

const run = uniqueRun();
const email = (name: string) => `${name}.${run}@coding-e2e.test`;
const PDF = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");
const contact = { fullName: "Coder", email: "coder@example.com", phone: "+880 1700 000000" };
const codingTest = {
  kind: "CODING",
  title: "Two Sum warm-up",
  timeLimitMin: 30,
  problemSlug: "two-sum",
};
const solution = "a, t = 0, 0\nprint(-1)\n";

describe("Coding tests (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let boss: request.Agent;
  let outsider: request.Agent;
  let jobId: string;

  const signUp = async (name: string, role: "SEEKER" | "EMPLOYER") => {
    const agent = request.agent(app.getHttpServer());
    await agent
      .post("/api/auth/register")
      .send({ fullName: `${name} C`, email: email(name), password: "Password123", role })
      .expect(201);
    await markVerified(app, email(name));
    return agent;
  };
  const seekerWhoApplied = async (name: string) => {
    const agent = await signUp(name, "SEEKER");
    await agent.post("/api/me/cv").attach("file", PDF, "cv.pdf").expect(201);
    const res = await agent.post(`/api/jobs/${jobId}/applications`).send({ contact }).expect(201);
    return { agent, applicationId: res.body.id as string };
  };

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
      .send({ name: `Code Co ${run}` })
      .expect(201);
    outsider = await signUp("outsider", "EMPLOYER");
    await outsider
      .post("/api/companies")
      .send({ name: `Code Other ${run}` })
      .expect(201);
    jobId = (
      await boss
        .post("/api/jobs")
        .send({
          title: `Coding ${run} role`,
          type: "FULL_TIME",
          workplace: "REMOTE",
          country: "Bangladesh",
          salaryMin: 1,
          salaryMax: 2,
          description: "A job with a coding test, used by the e2e suite.",
        })
        .expect(201)
    ).body.id;
  });

  afterAll(async () => {
    await prisma.company.deleteMany({ where: { name: { contains: run } } });
    await prisma.user.deleteMany({ where: { email: { endsWith: "@coding-e2e.test" } } });
    await app.close();
  });

  describe("the library", () => {
    it("lists 30 problems for employers, filtered, and hides it from seekers", async () => {
      const all = await boss.get("/api/coding-problems").expect(200);
      expect(all.body.items).toHaveLength(30);
      expect(all.body.topics).toContain("graphs");
      const hard = await boss.get("/api/coding-problems?difficulty=HARD").expect(200);
      expect(hard.body.items.every((p: { difficulty: string }) => p.difficulty === "HARD")).toBe(
        true,
      );
      const seeker = await signUp("curious", "SEEKER");
      await seeker.get("/api/coding-problems").expect(403);
    });

    it("previews a problem with samples only", async () => {
      const res = await boss.get("/api/coding-problems/two-sum").expect(200);
      expect(res.body).toMatchObject({ slug: "two-sum", difficulty: "MEDIUM" });
      expect(res.body.samples).toHaveLength(2);
      const hidden = getTests("two-sum").filter((t) => !t.sample);
      expect(res.body.hiddenTests).toBe(hidden.length);
      expect(JSON.stringify(res.body)).not.toContain(hidden.at(-1)!.input.trim());
      await boss.get("/api/coding-problems/not-a-problem").expect(404);
    });
  });

  describe("setting up", () => {
    it("replaces an MCQ with a coding test, for the hiring team only", async () => {
      await boss
        .put(`/api/jobs/${jobId}/assessment`)
        .send({
          title: "Old MCQ",
          timeLimitMin: 5,
          questions: [{ prompt: "Pick one, please", options: ["a", "b"], correctIndex: 0 }],
        })
        .expect(200);
      await boss
        .put(`/api/jobs/${jobId}/assessment`)
        .send({ ...codingTest, problemSlug: "nope" })
        .expect(400);
      await outsider.put(`/api/jobs/${jobId}/assessment`).send(codingTest).expect(403);

      const res = await boss.put(`/api/jobs/${jobId}/assessment`).send(codingTest).expect(200);
      expect(res.body).toMatchObject({ kind: "CODING", questions: [], locked: false });
      expect(res.body.problem.slug).toBe("two-sum");
      expect(await prisma.mcqQuestion.count({ where: { assessmentId: res.body.id } })).toBe(0);

      const job = await boss.get(`/api/jobs/${jobId}`).expect(200);
      expect(job.body).toMatchObject({ hasAssessment: true, assessmentKind: "CODING" });
    });
  });

  describe("taking it", () => {
    let seeker: request.Agent;
    let applicationId: string;
    let attemptId: string;

    it("starts with the problem's samples, no hidden tests and no code yet", async () => {
      ({ agent: seeker, applicationId } = await seekerWhoApplied("taker"));
      const mine = await seeker.get(`/api/me/applications/${applicationId}`).expect(200);
      expect(mine.body.test).toEqual({ state: "NOT_STARTED", score: null, kind: "CODING" });

      const res = await seeker.post(`/api/me/applications/${applicationId}/attempt`).expect(201);
      attemptId = res.body.id;
      expect(res.body).toMatchObject({ kind: "CODING", code: null, questions: [], answers: null });
      expect(res.body.problem.samples).toHaveLength(2);
      const hidden = getTests("two-sum").filter((t) => !t.sample);
      expect(JSON.stringify(res.body)).not.toContain(hidden.at(-1)!.input.trim());
    });

    it("autosaves the code, and only for its owner", async () => {
      await seeker
        .put(`/api/attempts/${attemptId}/draft`)
        .send({ language: "python", code: "print(1)" })
        .expect(204);
      const other = await signUp("snoop", "SEEKER");
      await other
        .put(`/api/attempts/${attemptId}/draft`)
        .send({ language: "python", code: "x" })
        .expect(404);
      await seeker
        .put(`/api/attempts/${attemptId}/draft`)
        .send({ language: "cobol", code: "x" })
        .expect(400);

      const resumed = await seeker
        .post(`/api/me/applications/${applicationId}/attempt`)
        .expect(201);
      expect(resumed.body.code).toEqual({ language: "python", code: "print(1)" });
    });

    it("submits language and code once, ungraded", async () => {
      await seeker.post(`/api/attempts/${attemptId}/submit`).send({ answers: [] }).expect(400);
      await seeker
        .post(`/api/attempts/${attemptId}/submit`)
        .send({ language: "python", code: "   " })
        .expect(400);
      const res = await seeker
        .post(`/api/attempts/${attemptId}/submit`)
        .send({ language: "python", code: solution })
        .expect(200);
      expect(res.body).toMatchObject({ score: null, code: { language: "python", code: solution } });
      expect(res.body.submittedAt).not.toBeNull();

      await seeker
        .post(`/api/attempts/${attemptId}/submit`)
        .send({ language: "python", code: "again" })
        .expect(409);
      await seeker
        .put(`/api/attempts/${attemptId}/draft`)
        .send({ language: "python", code: "late edit" })
        .expect(409);
    });

    it("shows the code to the hiring team only, and locks the test", async () => {
      const res = await boss.get(`/api/applications/${applicationId}/code`).expect(200);
      expect(res.body).toMatchObject({
        candidate: "taker C",
        language: "python",
        code: solution,
        timedOut: false,
        problem: { slug: "two-sum" },
      });
      await outsider.get(`/api/applications/${applicationId}/code`).expect(403);
      await seeker.get(`/api/applications/${applicationId}/code`).expect(403);

      const applicants = await boss.get(`/api/jobs/${jobId}/applications`).expect(200);
      const me = applicants.body.find((a: { id: string }) => a.id === applicationId);
      expect(me.test).toEqual({ state: "SUBMITTED", score: null, kind: "CODING" });

      await boss
        .put(`/api/jobs/${jobId}/assessment`)
        .send({ ...codingTest, problemSlug: "fizzbuzz" })
        .expect(409);
    });

    it("submits the last autosave when the time runs out", async () => {
      const late = await seekerWhoApplied("slow");
      const started = await late.agent
        .post(`/api/me/applications/${late.applicationId}/attempt`)
        .expect(201);
      await late.agent
        .put(`/api/attempts/${started.body.id}/draft`)
        .send({ language: "cpp", code: "int main() {}" })
        .expect(204);
      await prisma.attempt.update({
        where: { id: started.body.id },
        data: { startedAt: new Date(Date.now() - 2 * 60 * 60_000) },
      });

      await late.agent
        .post(`/api/attempts/${started.body.id}/submit`)
        .send({ language: "cpp", code: "too late" })
        .expect(409);
      const res = await boss.get(`/api/applications/${late.applicationId}/code`).expect(200);
      expect(res.body).toMatchObject({ language: "cpp", code: "int main() {}", timedOut: true });
    });

    it("has no code to show while it's in progress", async () => {
      const busy = await seekerWhoApplied("busy");
      await busy.agent.post(`/api/me/applications/${busy.applicationId}/attempt`).expect(201);
      const res = await boss.get(`/api/applications/${busy.applicationId}/code`).expect(200);
      expect(res.body).toMatchObject({ code: null, submittedAt: null });
    });
  });
});
