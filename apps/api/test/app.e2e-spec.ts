import {
  Body,
  Controller,
  Get,
  INestApplication,
  Module,
  NotFoundException,
  Post,
} from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { createZodDto } from "nestjs-zod";
import request from "supertest";
import { z } from "zod";
import { AppModule } from "../src/app.module";
import { setupApp } from "../src/app.setup";

class EchoDto extends createZodDto(z.object({ name: z.string().min(2) })) {}

// Test-only routes that exercise validation and error formatting.
@Controller("test")
class TestController {
  @Post("echo")
  echo(@Body() body: EchoDto) {
    return body;
  }

  @Get("missing")
  missing() {
    throw new NotFoundException("Nothing here");
  }

  @Get("boom")
  boom() {
    throw new Error("secret internal detail");
  }
}

@Module({ controllers: [TestController] })
class TestRoutesModule {}

describe("API foundation (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule, TestRoutesModule],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    setupApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /api/health returns ok", async () => {
    const res = await request(app.getHttpServer()).get("/api/health").expect(200);
    expect(res.body.status).toBe("ok");
  });

  it("serves the OpenAPI document", async () => {
    const res = await request(app.getHttpServer()).get("/api/docs-json").expect(200);
    expect(res.body.info.title).toBe("Jobify API");
    expect(res.body.paths).toHaveProperty("/api/health");
  });

  it("accepts a valid body", async () => {
    await request(app.getHttpServer())
      .post("/api/test/echo")
      .send({ name: "Jobify" })
      .expect(201, { name: "Jobify" });
  });

  it("returns a structured 400 for an invalid body", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/test/echo")
      .send({ name: "J" })
      .expect(400);
    expect(res.body).toMatchObject({
      statusCode: 400,
      error: "Bad Request",
      message: "Validation failed",
      path: "/api/test/echo",
    });
    expect(res.body.details[0].path).toBe("name");
  });

  it("formats HTTP exceptions", async () => {
    const res = await request(app.getHttpServer()).get("/api/test/missing").expect(404);
    expect(res.body).toMatchObject({
      statusCode: 404,
      error: "Not Found",
      message: "Nothing here",
    });
  });

  it("hides internal error details", async () => {
    const res = await request(app.getHttpServer()).get("/api/test/boom").expect(500);
    expect(res.body.message).toBe("Something went wrong");
    expect(JSON.stringify(res.body)).not.toContain("secret");
  });

  it("sets security headers", async () => {
    const res = await request(app.getHttpServer()).get("/api/health");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });
});
