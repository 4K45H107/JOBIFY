import { describe, expect, it } from "vitest";
import { seekerProfileUpdateSchema, skillsUpdateSchema } from "./profile";

describe("seekerProfileUpdateSchema", () => {
  it("turns empty optional text into null so fields can be cleared", () => {
    expect(seekerProfileUpdateSchema.parse({ headline: "  " })).toEqual({ headline: null });
  });

  it("validates birthdate format and minimum age", () => {
    expect(seekerProfileUpdateSchema.safeParse({ birthdate: "1999-02-30" }).success).toBe(false);
    expect(seekerProfileUpdateSchema.safeParse({ birthdate: "2024-01-01" }).success).toBe(false);
    expect(seekerProfileUpdateSchema.parse({ birthdate: "1999-05-04" }).birthdate).toBe(
      "1999-05-04",
    );
  });
});

describe("skillsUpdateSchema", () => {
  it("trims and removes case-insensitive duplicates", () => {
    expect(skillsUpdateSchema.parse({ skills: [" React", "react", "TypeScript"] }).skills).toEqual([
      "React",
      "TypeScript",
    ]);
  });

  it("caps the list at 30", () => {
    const skills = Array.from({ length: 31 }, (_, i) => `s${i}`);
    expect(skillsUpdateSchema.safeParse({ skills }).success).toBe(false);
  });
});
