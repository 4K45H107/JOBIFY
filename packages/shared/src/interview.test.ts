import { describe, expect, it } from "vitest";
import { interviewScheduleSchema, isJoinable } from "./interview";

describe("isJoinable", () => {
  const start = new Date("2026-11-01T10:00:00Z");
  it("opens 10 minutes early and closes 15 minutes after the end", () => {
    expect(isJoinable(start, 30, "SCHEDULED", new Date("2026-11-01T09:49:00Z"))).toBe(false);
    expect(isJoinable(start, 30, "SCHEDULED", new Date("2026-11-01T09:50:00Z"))).toBe(true);
    expect(isJoinable(start, 30, "LIVE", new Date("2026-11-01T10:45:00Z"))).toBe(true);
    expect(isJoinable(start, 30, "LIVE", new Date("2026-11-01T10:46:00Z"))).toBe(false);
  });

  it("never opens cancelled or completed interviews", () => {
    expect(isJoinable(start, 30, "CANCELLED", start)).toBe(false);
    expect(isJoinable(start, 30, "COMPLETED", start)).toBe(false);
  });
});

describe("interviewScheduleSchema", () => {
  it("needs an ISO date-time with an offset and a sane length", () => {
    expect(
      interviewScheduleSchema.safeParse({
        stage: "Final round",
        scheduledAt: "2026-11-01T10:00:00Z",
        durationMin: 45,
      }).success,
    ).toBe(true);
    expect(
      interviewScheduleSchema.safeParse({
        stage: "Final round",
        scheduledAt: "2026-11-01 10:00",
        durationMin: 45,
      }).success,
    ).toBe(false);
    expect(
      interviewScheduleSchema.safeParse({
        stage: "Final round",
        scheduledAt: "2026-11-01T10:00:00Z",
        durationMin: 5,
      }).success,
    ).toBe(false);
  });
});
