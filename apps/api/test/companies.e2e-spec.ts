import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { setupApp } from "../src/app.setup";
import { PrismaService } from "../src/prisma/prisma.service";
import { uniqueRun } from "./helpers";

const run = uniqueRun();
const email = (name: string) => `${name}.${run}@companies-e2e.test`;
const password = "Password123";
const companyName = `Acme ${run}`;
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

describe("Companies (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let founder: request.Agent;
  let recruiter: request.Agent;
  let recruiterId: string;
  let companyId: string;

  const signUp = async (name: string, role: "SEEKER" | "EMPLOYER" = "EMPLOYER") => {
    const agent = request.agent(app.getHttpServer());
    const res = await agent
      .post("/api/auth/register")
      .send({ fullName: `${name} Person`, email: email(name), password, role })
      .expect(201);
    return { agent, id: res.body.id as string };
  };

  beforeAll(async () => {
    process.env.THROTTLE_DISABLED = "true";
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    setupApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    founder = (await signUp("founder")).agent;
    ({ agent: recruiter, id: recruiterId } = await signUp("recruiter"));
  });

  afterAll(async () => {
    await prisma.company.deleteMany({ where: { name: { startsWith: `Acme ${run}` } } });
    await prisma.user.deleteMany({ where: { email: { endsWith: "@companies-e2e.test" } } });
    await app.close();
  });

  it("creates a company with the founder as active admin", async () => {
    const res = await founder
      .post("/api/companies")
      .send({
        name: companyName,
        industry: "Software",
        size: "SIZE_11_50",
        website: "https://acme.example.com",
      })
      .expect(201);
    companyId = res.body.id;
    expect(res.body).toMatchObject({
      name: companyName,
      slug: `acme-${run}`,
      employees: 1,
      openJobs: 0,
    });

    const me = await founder.get("/api/auth/me").expect(200);
    expect(me.body.company).toMatchObject({ id: companyId, role: "ADMIN", status: "ACTIVE" });
  });

  it("rejects a duplicate name (case-insensitive) and a second company for the same founder", async () => {
    await recruiter.post("/api/companies").send({ name: companyName.toUpperCase() }).expect(409);
    await founder
      .post("/api/companies")
      .send({ name: `Acme ${run} Two` })
      .expect(409);
  });

  it("validates input", async () => {
    await recruiter.post("/api/companies").send({ name: "X" }).expect(400);
    await recruiter
      .post("/api/companies")
      .send({ name: "Valid Name", website: "javascript:alert(1)" })
      .expect(400);
  });

  it("lists and finds companies by slug", async () => {
    const list = await recruiter
      .get(`/api/companies?q=${encodeURIComponent(companyName)}`)
      .expect(200);
    expect(list.body).toMatchObject({ total: 1, page: 1 });
    expect(list.body.items[0].name).toBe(companyName);
    await recruiter.get(`/api/companies/acme-${run}`).expect(200);
    await recruiter.get("/api/companies/does-not-exist").expect(404);
  });

  describe("join requests", () => {
    it("records a pending request and notifies the admin", async () => {
      await recruiter.post(`/api/companies/${companyId}/join-requests`).expect(204);
      const me = await recruiter.get("/api/auth/me").expect(200);
      expect(me.body.company).toMatchObject({
        id: companyId,
        status: "PENDING",
        role: "RECRUITER",
      });

      const founderUser = await prisma.user.findUniqueOrThrow({
        where: { email: email("founder") },
      });
      const notification = await prisma.notification.findFirst({
        where: { userId: founderUser.id, type: "COMPANY_JOIN_REQUESTED" },
      });
      expect(notification?.payload).toMatchObject({
        userId: recruiterId,
        name: "recruiter Person",
      });
    });

    it("blocks a second request while one is pending, and non-admins from deciding", async () => {
      await recruiter.post(`/api/companies/${companyId}/join-requests`).expect(409);
      await recruiter.get("/api/companies/mine/members").expect(404);
      await recruiter.post(`/api/companies/mine/members/${recruiterId}/approve`).expect(404);
    });

    it("lets the admin see and reject, then the employer can ask again and be approved", async () => {
      const pending = await founder.get("/api/companies/mine/members?status=PENDING").expect(200);
      expect(pending.body.map((m: { userId: string }) => m.userId)).toEqual([recruiterId]);

      await founder.post(`/api/companies/mine/members/${recruiterId}/reject`).expect(204);
      const rejected = await prisma.notification.findFirst({
        where: { userId: recruiterId, type: "COMPANY_JOIN_DECIDED" },
      });
      expect(rejected?.payload).toMatchObject({ approved: false });
      await founder.post(`/api/companies/mine/members/${recruiterId}/reject`).expect(404);

      await recruiter.post(`/api/companies/${companyId}/join-requests`).expect(204);
      await founder.post(`/api/companies/mine/members/${recruiterId}/approve`).expect(204);
      const mine = await recruiter.get("/api/companies/mine").expect(200);
      expect(mine.body).toMatchObject({ id: companyId, employees: 2 });
    });

    it("keeps admin-only actions from recruiters", async () => {
      await recruiter.patch("/api/companies/mine").send({ mission: "Take over" }).expect(403);
      await recruiter.get("/api/companies/mine/members").expect(403);
    });

    it("lets an employer withdraw a pending request", async () => {
      const { agent } = await signUp("withdrawer");
      await agent.post(`/api/companies/${companyId}/join-requests`).expect(204);
      await agent.delete("/api/companies/join-requests/mine").expect(204);
      const me = await agent.get("/api/auth/me").expect(200);
      expect(me.body.company).toBeNull();
    });
  });

  describe("admin editing", () => {
    it("updates details but keeps the slug", async () => {
      const res = await founder
        .patch("/api/companies/mine")
        .send({ name: `${companyName} Renamed`, mission: "Ship it", description: "" })
        .expect(200);
      expect(res.body).toMatchObject({
        name: `${companyName} Renamed`,
        slug: `acme-${run}`,
        mission: "Ship it",
        description: null,
      });
    });

    it("uploads a logo and a cover", async () => {
      const logo = await founder
        .post("/api/companies/mine/logo")
        .attach("file", PNG, "logo.png")
        .expect(201);
      expect(logo.body.logoUrl).toMatch(/^\/api\/files\/companies\/.+\/logo\/.+\.png$/);
      await recruiter.get(logo.body.logoUrl).expect(302);
      await founder
        .post("/api/companies/mine/cover")
        .attach("file", Buffer.from("%PDF-1.4"), "x.png")
        .expect(400);
    });

    it("adds and removes branches", async () => {
      const branch = await founder
        .post("/api/companies/mine/branches")
        .send({ name: "Dhaka office", city: "Dhaka", country: "Bangladesh" })
        .expect(201);
      const detail = await founder.get("/api/companies/mine").expect(200);
      expect(detail.body.branches).toHaveLength(1);
      await founder.delete(`/api/companies/mine/branches/${branch.body.id}`).expect(204);
      await founder.delete(`/api/companies/mine/branches/${branch.body.id}`).expect(404);
    });
  });

  it("keeps seekers out of company management", async () => {
    const { agent } = await signUp("seeker", "SEEKER");
    await agent.post("/api/companies").send({ name: "Seeker Co" }).expect(403);
    await agent.get("/api/companies").expect(200);
  });
});
