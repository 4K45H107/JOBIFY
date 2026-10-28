import { createHash } from "node:crypto";
import { Controller, Get, INestApplication, Module } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { setupApp } from "../src/app.setup";
import { CurrentUser, type RequestUser } from "../src/auth/decorators/current-user.decorator";
import { Roles } from "../src/auth/decorators/roles.decorator";
import { PrismaService } from "../src/prisma/prisma.service";

@Controller("test-roles")
class RolesTestController {
  @Roles("EMPLOYER")
  @Get("employer-only")
  employerOnly(@CurrentUser() user: RequestUser) {
    return { id: user.id };
  }
}

@Module({ controllers: [RolesTestController] })
class RolesTestModule {}

const run = Date.now().toString(36);
const email = (name: string) => `${name}.${run}@auth-e2e.test`;
const password = "Password123";

/** Returns the raw Set-Cookie header lines. */
const cookiesOf = (res: request.Response): string[] => {
  const header = res.headers["set-cookie"] as unknown;
  return Array.isArray(header) ? header : header ? [String(header)] : [];
};
const cookieValue = (res: request.Response, name: string) =>
  cookiesOf(res)
    .find((c) => c.startsWith(`${name}=`))
    ?.split(";")[0]
    ?.slice(name.length + 1);

describe("Auth (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    process.env.THROTTLE_DISABLED = "true";
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule, RolesTestModule],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    setupApp(app);
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { endsWith: "@auth-e2e.test" } } });
    await app.close();
  });

  const register = (name: string, role: "SEEKER" | "EMPLOYER" = "SEEKER") =>
    request(app.getHttpServer())
      .post("/api/auth/register")
      .send({ fullName: "Test User", email: email(name), password, role });

  describe("register", () => {
    it("creates a seeker, signs them in with httpOnly cookies and never returns the hash", async () => {
      const res = await register("ayesha").expect(201);

      expect(res.body).toMatchObject({
        email: email("ayesha"),
        role: "SEEKER",
        fullName: "Test User",
        company: null,
      });
      expect(JSON.stringify(res.body)).not.toContain("passwordHash");

      const cookies = cookiesOf(res);
      const access = cookies.find((c) => c.startsWith("jobify_access="))!;
      const refresh = cookies.find((c) => c.startsWith("jobify_refresh="))!;
      expect(access).toMatch(/HttpOnly/);
      expect(access).toMatch(/SameSite=Lax/);
      expect(refresh).toMatch(/HttpOnly/);
      expect(refresh).toMatch(/Path=\/;/);

      const stored = await prisma.user.findUniqueOrThrow({ where: { email: email("ayesha") } });
      expect(stored.passwordHash).toMatch(/^\$argon2/);
    });

    it("creates an employer profile for employers", async () => {
      const res = await register("boss", "EMPLOYER").expect(201);
      expect(res.body.role).toBe("EMPLOYER");
      const profile = await prisma.employerProfile.findUnique({ where: { userId: res.body.id } });
      expect(profile?.fullName).toBe("Test User");
    });

    it("rejects a duplicate email with 409", async () => {
      await register("dupe").expect(201);
      const res = await register("dupe").expect(409);
      expect(res.body.message).toMatch(/already exists/);
    });

    it("rejects a weak password and an ADMIN signup with 400", async () => {
      await request(app.getHttpServer())
        .post("/api/auth/register")
        .send({ fullName: "X Y", email: email("weak"), password: "short", role: "SEEKER" })
        .expect(400);
      await request(app.getHttpServer())
        .post("/api/auth/register")
        .send({ fullName: "X Y", email: email("admin"), password, role: "ADMIN" })
        .expect(400);
    });
  });

  describe("login and /me", () => {
    it("returns the same 401 message for a wrong password and an unknown email", async () => {
      await register("login").expect(201);
      const wrong = await request(app.getHttpServer())
        .post("/api/auth/login")
        .send({ email: email("login"), password: "WrongPass1" })
        .expect(401);
      const unknown = await request(app.getHttpServer())
        .post("/api/auth/login")
        .send({ email: email("nobody"), password })
        .expect(401);
      expect(wrong.body.message).toBe(unknown.body.message);
    });

    it("signs in, then /me works with the cookie and with a Bearer token", async () => {
      const agent = request.agent(app.getHttpServer());
      const res = await agent
        .post("/api/auth/login")
        .send({ email: email("login").toUpperCase(), password })
        .expect(200);

      const me = await agent.get("/api/auth/me").expect(200);
      expect(me.body.email).toBe(email("login"));

      await request(app.getHttpServer())
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${cookieValue(res, "jobify_access")}`)
        .expect(200);
    });

    it("rejects /me without a session and with a forged token", async () => {
      await request(app.getHttpServer()).get("/api/auth/me").expect(401);
      await request(app.getHttpServer())
        .get("/api/auth/me")
        .set("Authorization", "Bearer not.a.jwt")
        .expect(401);
    });

    it("includes the company membership for the seeded demo employer", async () => {
      const agent = request.agent(app.getHttpServer());
      await agent
        .post("/api/auth/login")
        .send({ email: "employer@jobify.dev", password: "Password123!" })
        .expect(200);
      const me = await agent.get("/api/auth/me").expect(200);
      expect(me.body.company).toMatchObject({
        name: "Northwind Labs",
        role: "ADMIN",
        status: "ACTIVE",
      });
    });
  });

  describe("refresh, reuse detection and logout", () => {
    it("rotates the refresh token", async () => {
      const agent = request.agent(app.getHttpServer());
      const login = await register("rotate").expect(201);
      const first = cookieValue(login, "jobify_refresh");

      const refreshed = await agent
        .post("/api/auth/refresh")
        .set("Cookie", `jobify_refresh=${first}`)
        .expect(204);
      const second = cookieValue(refreshed, "jobify_refresh");
      expect(second).toBeDefined();
      expect(second).not.toBe(first);
      expect(cookieValue(refreshed, "jobify_access")).toBeDefined();
    });

    it("tolerates parallel refreshes with the same token (grace window)", async () => {
      const login = await register("parallel").expect(201);
      const token = cookieValue(login, "jobify_refresh");
      const server = app.getHttpServer();

      const [a, b] = await Promise.all([
        request(server).post("/api/auth/refresh").set("Cookie", `jobify_refresh=${token}`),
        request(server).post("/api/auth/refresh").set("Cookie", `jobify_refresh=${token}`),
      ]);
      expect([a.status, b.status]).toEqual([204, 204]);
      // Exactly one response rotates the refresh token; both renew access.
      const rotated = [a, b].map((r) => cookieValue(r, "jobify_refresh")).filter(Boolean);
      expect(rotated).toHaveLength(1);
      expect(cookieValue(a, "jobify_access")).toBeDefined();
      expect(cookieValue(b, "jobify_access")).toBeDefined();
      // The rotated token still works.
      await request(server)
        .post("/api/auth/refresh")
        .set("Cookie", `jobify_refresh=${rotated[0]}`)
        .expect(204);
    });

    it("revokes every session when an old refresh token is reused after the grace window", async () => {
      const login = await register("reuse").expect(201);
      const first = cookieValue(login, "jobify_refresh")!;
      const server = app.getHttpServer();

      const rotated = await request(server)
        .post("/api/auth/refresh")
        .set("Cookie", `jobify_refresh=${first}`)
        .expect(204);
      const second = cookieValue(rotated, "jobify_refresh");

      // Pretend the rotation happened a minute ago.
      await prisma.session.update({
        where: { tokenHash: createHash("sha256").update(first).digest("hex") },
        data: { revokedAt: new Date(Date.now() - 60_000) },
      });

      // Attacker replays the stolen first token.
      await request(server)
        .post("/api/auth/refresh")
        .set("Cookie", `jobify_refresh=${first}`)
        .expect(401);
      // The legitimate client's newer token is now revoked too.
      await request(server)
        .post("/api/auth/refresh")
        .set("Cookie", `jobify_refresh=${second}`)
        .expect(401);
    });

    it("logout revokes the refresh token and clears cookies", async () => {
      const login = await register("logout").expect(201);
      const token = cookieValue(login, "jobify_refresh");
      const server = app.getHttpServer();

      const res = await request(server)
        .post("/api/auth/logout")
        .set("Cookie", `jobify_refresh=${token}`)
        .expect(204);
      expect(cookiesOf(res).some((c) => c.startsWith("jobify_access=;"))).toBe(true);
      await request(server)
        .post("/api/auth/refresh")
        .set("Cookie", `jobify_refresh=${token}`)
        .expect(401);
    });

    it("rejects refresh without a cookie", async () => {
      await request(app.getHttpServer()).post("/api/auth/refresh").expect(401);
    });
  });

  describe("roles", () => {
    it("lets employers in and keeps seekers out", async () => {
      const seeker = request.agent(app.getHttpServer());
      await seeker
        .post("/api/auth/login")
        .send({ email: email("ayesha"), password })
        .expect(200);
      await seeker.get("/api/test-roles/employer-only").expect(403);

      const employer = request.agent(app.getHttpServer());
      await employer
        .post("/api/auth/login")
        .send({ email: email("boss"), password })
        .expect(200);
      await employer.get("/api/test-roles/employer-only").expect(200);
    });
  });
});
