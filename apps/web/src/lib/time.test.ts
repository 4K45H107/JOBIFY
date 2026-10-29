import { describe, expect, it } from "vitest";
import { untilLabel } from "./time";

describe("untilLabel", () => {
  const now = Date.parse("2026-10-29T10:00:00Z");
  const at = (min: number) => new Date(now + min * 60_000).toISOString();
  it.each([
    [30, 60, "30 min remaining"],
    [120, 150, "2 hrs remaining"],
    [60 * 24 * 3, 60 * 24 * 3 + 30, "in 3 days"],
    [60 * 24 * 14, 60 * 24 * 14 + 30, "in 2 weeks"],
    [-5, 25, "Happening now"],
    [-60, -15, "Ended"],
  ])("start %i min -> %s", (start, end, label) => {
    expect(untilLabel(at(start as number), at(end as number), now)).toBe(label);
  });
});
