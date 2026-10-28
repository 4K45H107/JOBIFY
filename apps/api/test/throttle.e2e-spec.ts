import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { setupApp } from "../src/app.setup";

/** Rate limits must apply per client, even though every request arrives through the web proxy. */
describe("Rate limiting behind the web proxy (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    delete process.env.THROTTLE_DISABLED;
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    setupApp(app);
    await app.init();
  });

  afterAll(() => app.close());

  const login = (ip: string) =>
    request(app.getHttpServer())
      .post("/api/auth/login")
      .set("X-Forwarded-For", ip)
      .send({ email: "nobody@throttle.test", password: "wrong" });

  it("limits each forwarded client separately", async () => {
    for (let i = 0; i < 10; i++) await login("203.0.113.7").expect(401);
    await login("203.0.113.7").expect(429);
    // A different visitor behind the same proxy is unaffected.
    await login("198.51.100.23").expect(401);
  });
});
