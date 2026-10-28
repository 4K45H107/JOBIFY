import { validateEnv } from "./env";

const DATABASE_URL = "postgresql://jobify:jobify@localhost:5433/jobify";

describe("validateEnv", () => {
  it("applies defaults", () => {
    expect(validateEnv({ DATABASE_URL })).toEqual({
      NODE_ENV: "development",
      PORT: 4000,
      WEB_ORIGIN: "http://localhost:3000",
      DATABASE_URL,
    });
  });

  it("coerces PORT from a string", () => {
    expect(validateEnv({ DATABASE_URL, PORT: "8080" }).PORT).toBe(8080);
  });

  it("rejects an invalid WEB_ORIGIN", () => {
    expect(() => validateEnv({ DATABASE_URL, WEB_ORIGIN: "not a url" })).toThrow(/WEB_ORIGIN/);
  });

  it("requires a postgres DATABASE_URL", () => {
    expect(() => validateEnv({})).toThrow(/DATABASE_URL/);
    expect(() => validateEnv({ DATABASE_URL: "mysql://localhost/db" })).toThrow(/DATABASE_URL/);
  });
});
