import { describe, expect, it } from "vitest";
import { ApplicationStage, applySchema, canMoveTo, STAGE_TRANSITIONS } from "./application";

describe("stage transitions", () => {
  it("allows the normal pipeline", () => {
    expect(canMoveTo("APPLIED", "SHORTLISTED")).toBe(true);
    expect(canMoveTo("SHORTLISTED", "INTERVIEW")).toBe(true);
    expect(canMoveTo("INTERVIEW", "OFFER")).toBe(true);
  });

  it("treats OFFER and WITHDRAWN as final and blocks skipping back to APPLIED", () => {
    expect(STAGE_TRANSITIONS.OFFER).toEqual([]);
    expect(STAGE_TRANSITIONS.WITHDRAWN).toEqual([]);
    for (const stage of ApplicationStage.options) expect(canMoveTo(stage, "APPLIED")).toBe(false);
  });

  it("lets the team reconsider a rejection", () => {
    expect(canMoveTo("REJECTED", "SHORTLISTED")).toBe(true);
  });
});

describe("applySchema", () => {
  it("normalises contact details and defaults answers", () => {
    expect(
      applySchema.parse({ contact: { fullName: " Ayesha ", email: "A@B.CO", phone: "+880 1700" } }),
    ).toEqual({
      contact: { fullName: "Ayesha", email: "a@b.co", phone: "+880 1700" },
      answers: [],
    });
  });
});
