import { validateEnv } from "./env";

const DATABASE_URL = "postgresql://jobify:jobify@localhost:5433/jobify";
const JWT_ACCESS_SECRET = "x".repeat(32);
const base = { DATABASE_URL, JWT_ACCESS_SECRET };

describe("validateEnv", () => {
  it("applies defaults", () => {
    expect(validateEnv(base)).toEqual({
      NODE_ENV: "development",
      PORT: 4000,
      WEB_ORIGIN: "http://localhost:3000",
      DATABASE_URL,
      JWT_ACCESS_SECRET,
      ACCESS_TOKEN_TTL_SECONDS: 900,
      REFRESH_TOKEN_TTL_DAYS: 30,
      S3_REGION: "us-east-1",
      S3_BUCKET: "jobify",
      S3_ACCESS_KEY_ID: "jobify",
      S3_SECRET_ACCESS_KEY: "jobify-dev-secret",
      S3_FORCE_PATH_STYLE: true,
    });
  });

  it("coerces PORT from a string", () => {
    expect(validateEnv({ ...base, PORT: "8080" }).PORT).toBe(8080);
  });

  it("rejects an invalid WEB_ORIGIN", () => {
    expect(() => validateEnv({ ...base, WEB_ORIGIN: "not a url" })).toThrow(/WEB_ORIGIN/);
  });

  it("requires a postgres DATABASE_URL", () => {
    expect(() => validateEnv({ JWT_ACCESS_SECRET })).toThrow(/DATABASE_URL/);
    expect(() => validateEnv({ ...base, DATABASE_URL: "mysql://localhost/db" })).toThrow(
      /DATABASE_URL/,
    );
  });

  it("requires a long JWT secret", () => {
    expect(() => validateEnv({ DATABASE_URL, JWT_ACCESS_SECRET: "short" })).toThrow(
      /JWT_ACCESS_SECRET/,
    );
  });
});
