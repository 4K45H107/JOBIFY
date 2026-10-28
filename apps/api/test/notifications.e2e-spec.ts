import http from "node:http";
import type { AddressInfo } from "node:net";
import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { setupApp } from "../src/app.setup";
import { NotificationsService } from "../src/notifications/notifications.service";
import { PrismaService } from "../src/prisma/prisma.service";
import { uniqueRun } from "./helpers";

const run = uniqueRun();
const email = (name: string) => `${name}.${run}@notify-e2e.test`;

describe("Notifications (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let notifications: NotificationsService;
  let seeker: request.Agent;
  let seekerId: string;
  let cookie: string;

  beforeAll(async () => {
    process.env.THROTTLE_DISABLED = "true";
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    setupApp(app);
    await app.listen(0);
    prisma = app.get(PrismaService);
    notifications = app.get(NotificationsService);
    seeker = request.agent(app.getHttpServer());
    const res = await seeker
      .post("/api/auth/register")
      .send({
        fullName: "Notified Seeker",
        email: email("seeker"),
        password: "Password123",
        role: "SEEKER",
      })
      .expect(201);
    seekerId = res.body.id;
    cookie = (res.headers["set-cookie"] as unknown as string[])
      .map((c) => c.split(";")[0])
      .join("; ");
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { endsWith: "@notify-e2e.test" } } });
    await app.close();
  });

  it("lists notifications with readable text, newest first, and paginates", async () => {
    for (let i = 1; i <= 3; i++) {
      await notifications.notify([seekerId], "APPLICATION_STAGE_CHANGED", {
        jobTitle: `Job ${i}`,
        company: "Acme",
        stage: "SHORTLISTED",
      });
    }
    const first = await seeker.get("/api/notifications?limit=2").expect(200);
    expect(first.body.unread).toBe(3);
    expect(first.body.items.map((n: { body: string }) => n.body)).toEqual([
      "Your application for Job 3 has been shortlisted.",
      "Your application for Job 2 has been shortlisted.",
    ]);
    expect(first.body.items[0]).toMatchObject({
      href: "/activities?tab=applications",
      readAt: null,
    });

    const second = await seeker
      .get(`/api/notifications?limit=2&cursor=${first.body.nextCursor}`)
      .expect(200);
    expect(second.body.items.map((n: { body: string }) => n.body)).toEqual([
      "Your application for Job 1 has been shortlisted.",
    ]);
    expect(second.body.nextCursor).toBeNull();
  });

  it("marks one or all as read, and only the owner's", async () => {
    const feed = await seeker.get("/api/notifications").expect(200);
    await seeker.post(`/api/notifications/${feed.body.items[0].id}/read`).expect(204);
    expect((await seeker.get("/api/notifications/unread-count").expect(200)).body).toEqual({
      unread: 2,
    });

    const other = request.agent(app.getHttpServer());
    await other
      .post("/api/auth/register")
      .send({
        fullName: "Other Person",
        email: email("other"),
        password: "Password123",
        role: "SEEKER",
      })
      .expect(201);
    await other.post(`/api/notifications/${feed.body.items[1].id}/read`).expect(404);

    await seeker.post("/api/notifications/read-all").expect(204);
    expect((await seeker.get("/api/notifications/unread-count").expect(200)).body).toEqual({
      unread: 0,
    });
  });

  it("streams new notifications to their owner over Server-Sent Events", async () => {
    const { port } = app.getHttpServer().address() as AddressInfo;
    const received = new Promise<string>((resolve, reject) => {
      const req = http.get(
        { port, path: "/api/notifications/stream", headers: { cookie } },
        (res) => {
          expect(res.headers["content-type"]).toMatch(/text\/event-stream/);
          let buffer = "";
          res.on("data", (chunk: Buffer) => {
            buffer += chunk.toString();
            if (buffer.includes("event: notification")) {
              req.destroy();
              resolve(buffer);
            }
          });
          // Push once the stream is open.
          setTimeout(() => {
            void notifications.notify([seekerId], "ASSESSMENT_ASSIGNED", {
              jobTitle: "Live Job",
              company: "Acme",
              applicationId: "a1",
            });
          }, 100);
        },
      );
      req.on("error", (e) => (e.message.includes("aborted") ? undefined : reject(e)));
      setTimeout(() => reject(new Error("no event within 5s")), 5000);
    });
    const text = await received;
    const data = JSON.parse(text.split("data: ")[1]!.split("\n")[0]!);
    expect(data).toMatchObject({
      type: "ASSESSMENT_ASSIGNED",
      title: "Skill test for Live Job",
      href: "/applications/a1/test",
    });
  });

  it("requires a session for the stream", async () => {
    await request(app.getHttpServer()).get("/api/notifications/stream").expect(401);
  });
});
