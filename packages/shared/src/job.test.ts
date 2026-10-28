import { describe, expect, it } from "vitest";
import { jobCreateSchema, jobSearchQuerySchema, jobUpdateSchema } from "./job";

const valid = {
  title: "Frontend Developer",
  type: "FULL_TIME",
  workplace: "REMOTE",
  country: "Bangladesh",
  salaryMin: 50000,
  salaryMax: 70000,
  description: "Build accessible, fast interfaces with React and TypeScript.",
};

describe("jobCreateSchema", () => {
  it("fills defaults", () => {
    expect(jobCreateSchema.parse(valid)).toMatchObject({
      status: "OPEN",
      skills: [],
      screeningQuestions: [],
    });
  });

  it("checks salary and age ranges", () => {
    expect(jobCreateSchema.safeParse({ ...valid, salaryMax: 1 }).success).toBe(false);
    expect(jobCreateSchema.safeParse({ ...valid, ageMin: 30, ageMax: 20 }).success).toBe(false);
  });

  it("can't be created CLOSED", () => {
    expect(jobCreateSchema.safeParse({ ...valid, status: "CLOSED" }).success).toBe(false);
  });
});

describe("jobUpdateSchema", () => {
  it("allows partial updates and closing", () => {
    expect(jobUpdateSchema.parse({ status: "CLOSED" })).toEqual({ status: "CLOSED" });
  });
});

describe("jobSearchQuerySchema", () => {
  it("parses comma-separated filters and defaults", () => {
    expect(jobSearchQuerySchema.parse({ type: "FULL_TIME,CONTRACT", page: "2" })).toMatchObject({
      type: ["FULL_TIME", "CONTRACT"],
      workplace: [],
      sort: "latest",
      page: 2,
      pageSize: 10,
    });
  });

  it("rejects unknown filter values", () => {
    expect(jobSearchQuerySchema.safeParse({ type: "FULL_TIME,GIG" }).success).toBe(false);
  });
});
