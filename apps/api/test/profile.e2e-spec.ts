import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { setupApp } from "../src/app.setup";
import { PrismaService } from "../src/prisma/prisma.service";
import { uniqueRun } from "./helpers";

const run = uniqueRun();
const email = (name: string) => `${name}.${run}@profile-e2e.test`;
const password = "Password123";
const PDF = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

describe("Profile and files (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let seeker: request.Agent;
  let other: request.Agent;
  let employer: request.Agent;

  const signUp = async (name: string, role: "SEEKER" | "EMPLOYER") => {
    const agent = request.agent(app.getHttpServer());
    await agent
      .post("/api/auth/register")
      .send({ fullName: "Test Person", email: email(name), password, role })
      .expect(201);
    return agent;
  };

  beforeAll(async () => {
    process.env.THROTTLE_DISABLED = "true";
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    setupApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    seeker = await signUp("seeker", "SEEKER");
    other = await signUp("other", "SEEKER");
    employer = await signUp("employer", "EMPLOYER");
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { endsWith: "@profile-e2e.test" } } });
    await app.close();
  });

  it("returns an empty profile for a new seeker", async () => {
    const res = await seeker.get("/api/me/profile").expect(200);
    expect(res.body).toMatchObject({
      fullName: "Test Person",
      email: email("seeker"),
      cvUrl: null,
      skills: [],
      preferences: { titles: [], jobTypes: [], minSalary: null },
    });
  });

  it("updates and clears profile fields", async () => {
    const res = await seeker
      .patch("/api/me/profile")
      .send({
        headline: "Frontend developer",
        birthdate: "1999-05-04",
        experienceYears: 3,
        employmentStatus: "EMPLOYED",
      })
      .expect(200);
    expect(res.body).toMatchObject({
      headline: "Frontend developer",
      birthdate: "1999-05-04",
      experienceYears: 3,
    });

    const cleared = await seeker.patch("/api/me/profile").send({ headline: "" }).expect(200);
    expect(cleared.body.headline).toBeNull();
    expect(cleared.body.experienceYears).toBe(3);

    await seeker.patch("/api/me/profile").send({ experienceYears: -1 }).expect(400);
  });

  it("replaces skills, reusing existing skills case-insensitively", async () => {
    const res = await seeker
      .put("/api/me/skills")
      .send({ skills: ["react", "Zig Lang", "ZIG LANG"] })
      .expect(200);
    // "react" matches the seeded "React"; "Zig Lang" is new.
    expect(res.body.skills).toEqual(["React", "Zig Lang"]);

    const search = await seeker.get("/api/skills?q=zig").expect(200);
    expect(search.body).toContain("Zig Lang");
    await prisma.skill.deleteMany({ where: { name: "Zig Lang" } });
  });

  it("saves job preferences", async () => {
    const prefs = {
      titles: ["Frontend Developer"],
      locations: ["Dhaka"],
      jobTypes: ["FULL_TIME"],
      workplace: ["REMOTE"],
      minSalary: 50000,
    };
    const res = await seeker.put("/api/me/preferences").send(prefs).expect(200);
    expect(res.body.preferences).toEqual(prefs);
  });

  describe("uploads", () => {
    let cvUrl: string;

    it("accepts a PDF CV and serves it to the owner through a signed redirect", async () => {
      const res = await seeker.post("/api/me/cv").attach("file", PDF, "cv.pdf").expect(201);
      cvUrl = res.body.cvUrl;
      expect(cvUrl).toMatch(/^\/api\/files\/users\/[a-z0-9]+\/cv\/[0-9a-f-]{36}\.pdf$/);

      const redirect = await seeker.get(cvUrl).expect(302);
      const file = await fetch(redirect.headers.location!);
      expect(file.status).toBe(200);
      expect(
        Buffer.from(await file.arrayBuffer())
          .subarray(0, 5)
          .toString(),
      ).toBe("%PDF-");
    });

    it("rejects a non-PDF disguised as a PDF, and oversized files", async () => {
      await seeker
        .post("/api/me/cv")
        .attach("file", Buffer.from("<html>hi</html>"), {
          filename: "cv.pdf",
          contentType: "application/pdf",
        })
        .expect(400);
      await seeker.post("/api/me/cv").attach("file", PNG, "photo.png").expect(400);
      const big = Buffer.concat([PDF, Buffer.alloc(5 * 1024 * 1024)]);
      await seeker.post("/api/me/cv").attach("file", big, "big.pdf").expect(413);
      await seeker.post("/api/me/cv").expect(400);
    });

    it("keeps CVs private from other seekers and from employers the seeker never applied to", async () => {
      await other.get(cvUrl).expect(403);
      await employer.get(cvUrl).expect(403);
      await request(app.getHttpServer()).get(cvUrl).expect(401);
    });

    it("lets an employer open the CV of someone who applied to their company", async () => {
      const boss = request.agent(app.getHttpServer());
      await boss
        .post("/api/auth/login")
        .send({ email: "employer@jobify.dev", password: "Password123!" })
        .expect(200);
      const applicant = await prisma.application.findFirstOrThrow({
        where: {
          job: { company: { slug: "northwind-labs" } },
          seeker: { seekerProfile: { cvKey: { not: null } } },
        },
        include: { seeker: { include: { seekerProfile: true } } },
      });
      const key = applicant.seeker.seekerProfile!.cvKey!;
      await boss.get(`/api/files/${key}`).expect(302);
    });

    it("replaces the photo and deletes the old CV on removal", async () => {
      const photo = await seeker.post("/api/me/photo").attach("file", PNG, "me.png").expect(201);
      expect(photo.body.photoUrl).toMatch(/\.png$/);
      await other.get(photo.body.photoUrl).expect(302);

      const removed = await seeker.delete("/api/me/cv").expect(200);
      expect(removed.body.cvUrl).toBeNull();
    });

    it("404s malformed or path-traversal keys", async () => {
      await seeker.get("/api/files/users/../../etc/passwd").expect(404);
      await seeker.get("/api/files/users/abc/cv/not-a-uuid.pdf").expect(404);
    });
  });

  describe("employer profile and role checks", () => {
    it("lets employers edit their profile and photo", async () => {
      const res = await employer
        .patch("/api/me/employer-profile")
        .send({ designation: "Recruiter" })
        .expect(200);
      expect(res.body).toMatchObject({
        fullName: "Test Person",
        designation: "Recruiter",
        photoUrl: null,
      });
      const photo = await employer.post("/api/me/photo").attach("file", PNG, "me.png").expect(201);
      expect(photo.body.photoUrl).toMatch(/\.png$/);
    });

    it("keeps each role to its own profile endpoints", async () => {
      await employer.get("/api/me/profile").expect(403);
      await seeker.get("/api/me/employer-profile").expect(403);
    });
  });
});
