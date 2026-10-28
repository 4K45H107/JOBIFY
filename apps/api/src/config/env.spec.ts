import { validateEnv } from "./env";

describe("validateEnv", () => {
  it("applies defaults", () => {
    expect(validateEnv({})).toEqual({
      NODE_ENV: "development",
      PORT: 4000,
      WEB_ORIGIN: "http://localhost:3000",
    });
  });

  it("coerces PORT from a string", () => {
    expect(validateEnv({ PORT: "8080" }).PORT).toBe(8080);
  });

  it("rejects an invalid WEB_ORIGIN", () => {
    expect(() => validateEnv({ WEB_ORIGIN: "not a url" })).toThrow(/WEB_ORIGIN/);
  });
});
