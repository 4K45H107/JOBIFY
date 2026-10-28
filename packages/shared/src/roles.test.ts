import { describe, expect, it } from "vitest";
import { UserRole } from "./roles";

describe("UserRole", () => {
  it("accepts known roles", () => {
    expect(UserRole.parse("SEEKER")).toBe("SEEKER");
  });

  it("rejects unknown roles", () => {
    expect(UserRole.safeParse("GUEST").success).toBe(false);
  });
});
