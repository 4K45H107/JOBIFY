import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { setupApp } from "../src/app.setup";
import { PrismaService } from "../src/prisma/prisma.service";
import { markVerified, uniqueRun } from "./helpers";

const run = uniqueRun();
const email = (name: string) => `${name}.${run}@search-e2e.test`;

const JOBS = [
  {
    title: "Frontend Developer",
    skills: ["React", "TypeScript"],
    workplace: "REMOTE",
    city: "Dhaka",
  },
  {
    title: "Backend Engineer",
    skills: ["Python", "PostgreSQL"],
    workplace: "ONSITE",
    city: "Berlin",
  },
  { title: "Machine Learning Engineer", skills: ["Python"], workplace: "HYBRID", city: "Toronto" },
  { title: "Sales Executive", skills: ["Negotiation"], workplace: "ONSITE", city: "London" },
] as const;

describe("Job search (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let seeker: request.Agent;
  let slug: string;

  /** Searches only this suite's company, so other data can't change the results. */
  const search = async (q: string, extra = "") => {
    const res = await seeker
      .get(`/api/jobs?companySlug=${slug}&q=${encodeURIComponent(q)}${extra}`)
      .expect(200);
    return {
      titles: res.body.items.map((j: { title: string }) => j.title) as string[],
      partial: res.body.partialMatch as boolean | undefined,
      total: res.body.total as number,
    };
  };

  beforeAll(async () => {
    process.env.THROTTLE_DISABLED = "true";
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    setupApp(app);
    await app.init();
    prisma = app.get(PrismaService);

    const signUp = async (name: string, role: "SEEKER" | "EMPLOYER") => {
      const agent = request.agent(app.getHttpServer());
      await agent
        .post("/api/auth/register")
        .send({ fullName: `${name} S`, email: email(name), password: "Password123", role })
        .expect(201);
      await markVerified(app, email(name));
      return agent;
    };
    const boss = await signUp("boss", "EMPLOYER");
    slug = (
      await boss
        .post("/api/companies")
        .send({ name: `Search Co ${run}` })
        .expect(201)
    ).body.slug;
    for (const job of JOBS) {
      await boss
        .post("/api/jobs")
        .send({
          ...job,
          skills: [...job.skills],
          type: "FULL_TIME",
          country: "Somewhere",
          salaryMin: 1000,
          salaryMax: 2000,
          description: "A role created by the search end-to-end tests, described at length.",
        })
        .expect(201);
    }
    seeker = await signUp("seeker", "SEEKER");
  });

  afterAll(async () => {
    await prisma.company.deleteMany({ where: { name: { contains: run } } });
    await prisma.user.deleteMany({ where: { email: { endsWith: "@search-e2e.test" } } });
    await app.close();
  });

  it("matches word forms and spelling variants", async () => {
    expect((await search("front end developers")).titles).toEqual(["Frontend Developer"]);
    expect((await search("engineers")).titles.sort()).toEqual([
      "Backend Engineer",
      "Frontend Developer",
      "Machine Learning Engineer",
    ]);
  });

  it("understands common abbreviations and synonyms", async () => {
    expect((await search("ML")).titles).toEqual(["Machine Learning Engineer"]);
    expect((await search("postgres")).titles).toEqual(["Backend Engineer"]);
    expect((await search("wfh")).titles).toEqual(["Frontend Developer"]);
  });

  it("forgives typos in titles, skills and company names", async () => {
    expect((await search("reakt")).titles).toEqual(["Frontend Developer"]);
    expect((await search("pyhton")).titles.sort()).toEqual([
      "Backend Engineer",
      "Machine Learning Engineer",
    ]);
    expect((await search("negotiaton")).titles).toEqual(["Sales Executive"]);
  });

  it("matches prefixes while typing", async () => {
    expect((await search("negot")).titles).toEqual(["Sales Executive"]);
  });

  it("ignores filler words and needs every word to match", async () => {
    const res = await search("remote react jobs in dhaka");
    expect(res).toMatchObject({ titles: ["Frontend Developer"], partial: undefined });
  });

  it("falls back to jobs matching some words, most matched first, and says so", async () => {
    const res = await search("python berlin sales");
    expect(res.partial).toBe(true);
    // Backend Engineer has two of the three words.
    expect(res.titles[0]).toBe("Backend Engineer");
    expect(res.titles).toContain("Sales Executive");
  });

  it("ranks title matches first and still honours other sorts and filters", async () => {
    const best = await search("python");
    expect(best.titles).toHaveLength(2);
    const onsite = await search("python", "&workplace=ONSITE");
    expect(onsite.titles).toEqual(["Backend Engineer"]);
    const latest = await search("engineer", "&sort=latest");
    expect(latest.titles[0]).toBe("Machine Learning Engineer");
  });

  it("finds nothing for nonsense, without claiming a partial match", async () => {
    expect(await search("zzzz qqqq")).toEqual({ titles: [], partial: undefined, total: 0 });
  });
});
