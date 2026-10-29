import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { TokenVerifier } from "livekit-server-sdk";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { setupApp } from "../src/app.setup";
import { PrismaService } from "../src/prisma/prisma.service";
import { uniqueRun } from "./helpers";

const run = uniqueRun();
const email = (name: string) => `${name}.${run}@iv-e2e.test`;
const PDF = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");
const inMinutes = (m: number) => new Date(Date.now() + m * 60_000).toISOString();

describe("Interviews (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let boss: request.Agent;
  let outsider: request.Agent;
  let seeker: request.Agent;
  let seekerId: string;
  let jobId: string;
  let applicationId: string;
  let interviewId: string;

  const signUp = async (name: string, role: "SEEKER" | "EMPLOYER") => {
    const agent = request.agent(app.getHttpServer());
    const res = await agent
      .post("/api/auth/register")
      .send({ fullName: `${name} I`, email: email(name), password: "Password123", role })
      .expect(201);
    return { agent, id: res.body.id as string };
  };
  const apply = async (agent: request.Agent) => {
    await agent.post("/api/me/cv").attach("file", PDF, "cv.pdf").expect(201);
    const res = await agent
      .post(`/api/jobs/${jobId}/applications`)
      .send({
        contact: { fullName: "Iv Candidate", email: "c@example.com", phone: "+880 1700 000000" },
      })
      .expect(201);
    return res.body.id as string;
  };

  beforeAll(async () => {
    process.env.THROTTLE_DISABLED = "true";
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    setupApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    boss = (await signUp("boss", "EMPLOYER")).agent;
    await boss
      .post("/api/companies")
      .send({ name: `Iv Co ${run}` })
      .expect(201);
    outsider = (await signUp("outsider", "EMPLOYER")).agent;
    await outsider
      .post("/api/companies")
      .send({ name: `Iv Other ${run}` })
      .expect(201);
    jobId = (
      await boss
        .post("/api/jobs")
        .send({
          title: "Interview role",
          type: "FULL_TIME",
          workplace: "REMOTE",
          country: "Bangladesh",
          salaryMin: 1,
          salaryMax: 2,
          description: "A job used by the interview end-to-end tests.",
        })
        .expect(201)
    ).body.id;
    ({ agent: seeker, id: seekerId } = await signUp("seeker", "SEEKER"));
    applicationId = await apply(seeker);
  });

  afterAll(async () => {
    await prisma.company.deleteMany({ where: { name: { contains: run } } });
    await prisma.user.deleteMany({ where: { email: { endsWith: "@iv-e2e.test" } } });
    await app.close();
  });

  const schedule = (agent: request.Agent, appId: string, body: Record<string, unknown>) =>
    agent
      .post(`/api/applications/${appId}/interviews`)
      .send({ stage: "Technical round", durationMin: 45, ...body });

  it("needs a shortlisted applicant, a future time and the hiring company", async () => {
    await schedule(boss, applicationId, { scheduledAt: inMinutes(5) }).expect(409);
    await boss
      .patch(`/api/applications/${applicationId}/stage`)
      .send({ stage: "SHORTLISTED" })
      .expect(200);
    await schedule(boss, applicationId, { scheduledAt: inMinutes(-30) }).expect(400);
    await schedule(boss, applicationId, { scheduledAt: "tomorrow" }).expect(400);
    await schedule(outsider, applicationId, { scheduledAt: inMinutes(5) }).expect(403);
  });

  it("schedules, moves the application to INTERVIEW and notifies the seeker", async () => {
    const res = await schedule(boss, applicationId, { scheduledAt: inMinutes(5) }).expect(201);
    interviewId = res.body.id;
    expect(res.body).toMatchObject({
      stage: "Technical round",
      durationMin: 45,
      status: "SCHEDULED",
      canJoin: true,
      job: { id: jobId },
    });
    expect(
      (await prisma.application.findUniqueOrThrow({ where: { id: applicationId } })).stage,
    ).toBe("INTERVIEW");
    const n = await prisma.notification.findFirst({
      where: { userId: seekerId, type: "INTERVIEW_SCHEDULED" },
    });
    expect(n?.payload).toMatchObject({ interviewId, jobTitle: "Interview role" });
  });

  it("refuses overlapping interviews for the same people", async () => {
    await schedule(boss, applicationId, { scheduledAt: inMinutes(30) }).expect(409);
    await schedule(boss, applicationId, { scheduledAt: inMinutes(120) }).expect(201);
  });

  it("lists interviews for both sides", async () => {
    const mine = await seeker.get("/api/interviews").expect(200);
    expect(mine.body.map((i: { id: string }) => i.id)).toContain(interviewId);
    const team = await boss.get(`/api/interviews?jobId=${jobId}`).expect(200);
    expect(team.body).toHaveLength(2);
    expect((await outsider.get("/api/interviews").expect(200)).body).toHaveLength(0);
  });

  it("issues a LiveKit token for the room to the two parties only", async () => {
    const res = await seeker.post(`/api/interviews/${interviewId}/join`).expect(201);
    expect(res.body.url).toMatch(/^wss?:\/\//);
    const claims = await new TokenVerifier("devkey", "secret").verify(res.body.token);
    expect(claims.sub).toBe(seekerId);
    expect(claims.video).toMatchObject({
      room: res.body.roomName,
      roomJoin: true,
      canPublish: true,
    });
    expect((await prisma.interview.findUniqueOrThrow({ where: { id: interviewId } })).status).toBe(
      "LIVE",
    );

    await boss.post(`/api/interviews/${interviewId}/join`).expect(201);
    await outsider.post(`/api/interviews/${interviewId}/join`).expect(404);
    const stranger = (await signUp("stranger", "SEEKER")).agent;
    await stranger.post(`/api/interviews/${interviewId}/join`).expect(404);
  });

  it("keeps the room closed until 10 minutes before the start", async () => {
    const later = (await boss.get(`/api/interviews?jobId=${jobId}`).expect(200)).body.find(
      (i: { id: string }) => i.id !== interviewId,
    );
    expect(later.canJoin).toBe(false);
    await seeker.post(`/api/interviews/${later.id}/join`).expect(403);
  });

  it("reschedules and cancels, notifying the seeker, and closes the room", async () => {
    const later = (await boss.get(`/api/interviews?jobId=${jobId}`).expect(200)).body.find(
      (i: { id: string }) => i.id !== interviewId,
    );
    const moved = await boss
      .patch(`/api/interviews/${later.id}`)
      .send({ scheduledAt: inMinutes(240), stage: "Final round" })
      .expect(200);
    expect(moved.body).toMatchObject({ stage: "Final round" });
    const notes = await prisma.notification.findMany({
      where: { userId: seekerId, type: "INTERVIEW_SCHEDULED" },
    });
    expect(notes.some((n) => (n.payload as { rescheduled?: boolean }).rescheduled)).toBe(true);

    await boss.patch(`/api/interviews/${later.id}`).send({ status: "CANCELLED" }).expect(200);
    await seeker.post(`/api/interviews/${later.id}/join`).expect(403);
    await boss.patch(`/api/interviews/${later.id}`).send({ status: "CANCELLED" }).expect(409);
    await seeker.patch(`/api/interviews/${later.id}`).send({ status: "CANCELLED" }).expect(403);

    const past = await seeker.get("/api/interviews?scope=past").expect(200);
    expect(past.body.map((i: { id: string }) => i.id)).toContain(later.id);
  });

  it("completes an interview", async () => {
    const res = await boss
      .patch(`/api/interviews/${interviewId}`)
      .send({ status: "COMPLETED" })
      .expect(200);
    expect(res.body).toMatchObject({ status: "COMPLETED", canJoin: false });
  });
});
