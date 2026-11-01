import { describe, expect, it } from "vitest";
import { EMAIL_TYPES, emailTypeLabel } from "./email";

describe("email types", () => {
  it("lists each type once per role", () => {
    for (const types of Object.values(EMAIL_TYPES)) {
      const ids = types.map((t) => t.type);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("labels known types and falls back for others", () => {
    expect(emailTypeLabel("SEEKER", "INTERVIEW_REMINDER")).toBe("Interview reminders");
    expect(emailTypeLabel("SEEKER", "APPLICATION_SUBMITTED")).toBe("these");
  });
});
