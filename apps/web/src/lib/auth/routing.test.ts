import { describe, expect, it } from "vitest";
import { decideRoute, employerCompanyRedirect, safeNext } from "./routing";

describe("decideRoute", () => {
  it("sends visitors without a session to login, remembering where they were going", () => {
    expect(decideRoute("/activities", "?tab=saved", null)).toEqual({
      type: "redirect",
      to: "/login?next=%2Factivities%3Ftab%3Dsaved",
    });
    expect(decideRoute("/", "", null)).toEqual({ type: "redirect", to: "/login" });
    expect(decideRoute("/login", "", null)).toEqual({ type: "allow" });
  });

  it("keeps signed-in users off the auth pages", () => {
    expect(decideRoute("/login", "", "SEEKER")).toEqual({ type: "redirect", to: "/" });
    expect(decideRoute("/register", "", "EMPLOYER")).toEqual({ type: "redirect", to: "/employer" });
  });

  it("keeps each role in its own area", () => {
    expect(decideRoute("/explore/jobs", "", "EMPLOYER")).toEqual({
      type: "redirect",
      to: "/employer",
    });
    expect(decideRoute("/employer/company", "", "SEEKER")).toEqual({ type: "redirect", to: "/" });
    expect(decideRoute("/employer/company", "", "EMPLOYER")).toEqual({ type: "allow" });
    expect(decideRoute("/explore/jobs", "", "SEEKER")).toEqual({ type: "allow" });
  });

  it("does not treat /employers as the employer area", () => {
    expect(decideRoute("/employers", "", "SEEKER")).toEqual({ type: "allow" });
  });
});

describe("safeNext", () => {
  it.each(["https://evil.com", "//evil.com", "/\\evil.com", "", null])("rejects %s", (value) => {
    expect(safeNext(value)).toBeNull();
  });

  it("accepts relative paths", () => {
    expect(safeNext("/activities?tab=saved")).toBe("/activities?tab=saved");
  });
});

describe("employerCompanyRedirect", () => {
  it("sends employers without an active company to onboarding", () => {
    expect(employerCompanyRedirect("/employer", null)).toBe("/employer/onboarding");
    expect(employerCompanyRedirect("/employer/jobs/new", "PENDING")).toBe("/employer/onboarding");
  });

  it("still lets them reach onboarding and their own settings", () => {
    expect(employerCompanyRedirect("/employer/onboarding", null)).toBeNull();
    expect(employerCompanyRedirect("/employer/settings", "PENDING")).toBeNull();
  });

  it("moves members off onboarding and leaves other pages alone", () => {
    expect(employerCompanyRedirect("/employer/onboarding", "ACTIVE")).toBe("/employer");
    expect(employerCompanyRedirect("/employer/company", "ACTIVE")).toBeNull();
  });
});
