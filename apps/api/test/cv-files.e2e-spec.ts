import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { setupApp } from "../src/app.setup";
import { PrismaService } from "../src/prisma/prisma.service";
import { StorageService } from "../src/storage/storage.service";
import { markVerified, uniqueRun } from "./helpers";

const run = uniqueRun();
const email = (name: string) => `${name}.${run}@cv-files-e2e.test`;
const PDF = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");

describe("CV files (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let storage: StorageService;
  let seeker: request.Agent;
  let seekerId: string;
  let boss: request.Agent;
  let jobId: string;

  const signUp = async (name: string, role: "SEEKER" | "EMPLOYER") => {
    const agent = request.agent(app.getHttpServer());
    const res = await agent
      .post("/api/auth/register")
      .send({ fullName: `${name} P`, email: email(name), password: "Password123", role })
      .expect(201);
    await markVerified(app, email(name));
    return { agent, id: res.body.id as string };
  };
  const profileCvKey = async () =>
    (await prisma.seekerProfile.findUniqueOrThrow({ where: { userId: seekerId } })).cvKey!;

  beforeAll(async () => {
    process.env.THROTTLE_DISABLED = "true";
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    setupApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    storage = app.get(StorageService);

    ({ agent: seeker, id: seekerId } = await signUp("seeker", "SEEKER"));
    boss = (await signUp("boss", "EMPLOYER")).agent;
    await boss
      .post("/api/companies")
      .send({ name: `CV Co ${run}` })
      .expect(201);
    jobId = (
      await boss
        .post("/api/jobs")
        .send({
          title: `CV ${run} Engineer`,
          type: "FULL_TIME",
          workplace: "REMOTE",
          country: "Bangladesh",
          salaryMin: 1000,
          salaryMax: 2000,
          description: "A job used by the CV files end-to-end tests, long enough.",
        })
        .expect(201)
    ).body.id;
  });

  afterAll(async () => {
    await prisma.company.deleteMany({ where: { name: { contains: run } } });
    await prisma.user.deleteMany({ where: { email: { endsWith: "@cv-files-e2e.test" } } });
    await app.close();
  });

  it("keeps a profile CV that an application still points at when it's replaced", async () => {
    await seeker.post("/api/me/cv").attach("file", PDF, "cv.pdf").expect(201);
    const shared = await profileCvKey();
    // Older data: the application uses the profile's file instead of its own copy.
    await prisma.application.create({
      data: {
        jobId,
        seekerId,
        cvKey: shared,
        contact: { fullName: "S", email: "s@x.co", phone: "1" },
      },
    });

    await seeker.post("/api/me/cv").attach("file", PDF, "cv2.pdf").expect(201);
    expect(await profileCvKey()).not.toBe(shared);
    expect(await storage.exists(shared)).toBe(true);
    await boss.get(`/api/files/${shared}`).expect(302);
  });

  it("still deletes a replaced CV nothing else uses", async () => {
    const unused = await profileCvKey();
    await seeker.delete("/api/me/cv").expect(200);
    expect(await storage.exists(unused)).toBe(false);
  });

  it("answers a missing file with a clear 404, not the storage's error page", async () => {
    const res = await seeker
      .get(`/api/files/users/${seekerId}/cv/00000000-0000-4000-8000-000000000000.pdf`)
      .expect(404);
    expect(res.body.message).toBe("This file is no longer available");
  });
});
