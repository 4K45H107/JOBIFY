import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { vi } from "vitest";
import { AppModule } from "../src/app.module";
import { setupApp } from "../src/app.setup";
import { type GoogleClaims, GoogleService } from "../src/auth/google.service";
import { PrismaService } from "../src/prisma/prisma.service";
import { uniqueRun } from "./helpers";

const run = uniqueRun();
const email = (name: string) => `${name}.${run}@google-e2e.test`;

/** "name=value" for each Set-Cookie line, joined for a Cookie header. */
const cookiesFrom = (res: request.Response) =>
  ((res.headers["set-cookie"] as unknown as string[] | undefined) ?? [])
    .map((c) => c.split(";")[0] ?? "")
    .filter((c) => !c.endsWith("="))
    .join("; ");

describe("Google sign-in (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let google: GoogleService;
  /** What the fake Google returns for the next sign-in. */
  let claims: Omit<GoogleClaims, "nonce">;
  let nonceOverride: string | undefined;

  beforeAll(async () => {
    process.env.THROTTLE_DISABLED = "true";
    process.env.GOOGLE_CLIENT_ID = "test-client.apps.googleusercontent.com";
    process.env.GOOGLE_CLIENT_SECRET = "test-secret";
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    setupApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    google = app.get(GoogleService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { endsWith: "@google-e2e.test" } } });
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    await app.close();
  });

  /** Start → (fake) Google → callback. Returns the callback response. */
  const signInWithGoogle = async (query = "") => {
    const start = await request(app.getHttpServer()).get(`/api/auth/google${query}`).expect(302);
    const google_ = new URL(start.headers.location as string);
    const state = google_.searchParams.get("state")!;
    const nonce = google_.searchParams.get("nonce")!;
    // The fake token exchange echoes the nonce Google would have put in the ID token.
    vi.spyOn(google, "fetchClaims").mockResolvedValueOnce({
      ...claims,
      nonce: nonceOverride ?? nonce,
    });
    return request(app.getHttpServer())
      .get(`/api/auth/google/callback?code=abc&state=${state}`)
      .set("Cookie", cookiesFrom(start));
  };

  it("is switched on, and sends people to Google with state, PKCE and a nonce", async () => {
    await request(app.getHttpServer())
      .get("/api/auth/providers")
      .expect(200)
      .expect({ google: true });
    const res = await request(app.getHttpServer()).get("/api/auth/google?next=/jobs/1").expect(302);
    const url = new URL(res.headers.location as string);
    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(url.searchParams.get("client_id")).toBe("test-client.apps.googleusercontent.com");
    expect(url.searchParams.get("redirect_uri")).toMatch(/\/api\/auth\/google\/callback$/);
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("state")).toBeTruthy();
    expect(cookiesFrom(res)).toMatch(/^jobify_google=/);
  });

  it("new email: asks for the role, then creates a verified account without a password", async () => {
    claims = { sub: `g-new-${run}`, email: email("new"), emailVerified: true, name: "Nadia Islam" };
    const callback = await signInWithGoogle("?next=/jobs/1");
    expect(callback.status).toBe(302);
    expect(callback.headers.location).toBe("/register/google?next=%2Fjobs%2F1");

    const pendingCookie = cookiesFrom(callback);
    const pending = await request(app.getHttpServer())
      .get("/api/auth/google/pending")
      .set("Cookie", pendingCookie)
      .expect(200);
    expect(pending.body).toEqual({ email: email("new"), fullName: "Nadia Islam" });

    const agent = request.agent(app.getHttpServer());
    const done = await agent
      .post("/api/auth/google/complete")
      .set("Cookie", pendingCookie)
      .send({ role: "SEEKER", fullName: "Nadia Islam" })
      .expect(201);
    expect(done.body).toMatchObject({ role: "SEEKER", emailVerified: true, hasPassword: false });
    const user = await prisma.user.findUniqueOrThrow({ where: { email: email("new") } });
    expect(user.googleId).toBe(`g-new-${run}`);

    // Next time the same Google account goes straight in.
    const again = await signInWithGoogle();
    expect(again.headers.location).toBe("/signing-in");
    expect(cookiesFrom(again)).toMatch(/jobify_access=/);
  });

  it("with a role from the sign-up page, creates the account straight away", async () => {
    claims = { sub: `g-boss-${run}`, email: email("boss"), emailVerified: true, name: "Boss" };
    const res = await signInWithGoogle("?role=EMPLOYER");
    expect(res.headers.location).toBe("/signing-in");
    const user = await prisma.user.findUniqueOrThrow({ where: { email: email("boss") } });
    expect(user.role).toBe("EMPLOYER");
  });

  it("links Google to an existing account with the same email, and verifies it", async () => {
    await request(app.getHttpServer())
      .post("/api/auth/register")
      .send({ fullName: "Old User", email: email("old"), password: "Password123", role: "SEEKER" })
      .expect(201);
    claims = { sub: `g-old-${run}`, email: email("old"), emailVerified: true, name: "Old User" };
    const res = await signInWithGoogle();
    expect(res.headers.location).toBe("/signing-in");
    const user = await prisma.user.findUniqueOrThrow({ where: { email: email("old") } });
    expect(user.googleId).toBe(`g-old-${run}`);
    expect(user.emailVerifiedAt).not.toBeNull();
  });

  it("refuses unverified Google emails, a wrong nonce, a wrong state, and a cancel", async () => {
    claims = { sub: `g-x-${run}`, email: email("x"), emailVerified: false, name: "X" };
    expect((await signInWithGoogle()).headers.location).toBe("/login?error=google");

    claims = { sub: `g-y-${run}`, email: email("y"), emailVerified: true, name: "Y" };
    nonceOverride = "another-attempt";
    expect((await signInWithGoogle()).headers.location).toBe("/login?error=google");
    nonceOverride = undefined;

    const start = await request(app.getHttpServer()).get("/api/auth/google").expect(302);
    const forged = await request(app.getHttpServer())
      .get("/api/auth/google/callback?code=abc&state=forged")
      .set("Cookie", cookiesFrom(start));
    expect(forged.headers.location).toBe("/login?error=google");

    const cancelled = await request(app.getHttpServer()).get(
      "/api/auth/google/callback?error=access_denied",
    );
    expect(cancelled.headers.location).toBe("/login?error=google-cancelled");

    await request(app.getHttpServer())
      .post("/api/auth/google/complete")
      .send({ role: "SEEKER", fullName: "No Cookie" })
      .expect(401);
    expect(await prisma.user.count({ where: { email: { in: [email("x"), email("y")] } } })).toBe(0);
  });

  it("lets a Google-only account set a password with forgot password", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/auth/password/forgot")
      .send({ email: email("new") })
      .expect(204);
    expect(res.status).toBe(204);
    const token = await prisma.authToken.findFirst({
      where: { user: { email: email("new") }, type: "PASSWORD_RESET" },
    });
    expect(token).not.toBeNull();
  });
});
