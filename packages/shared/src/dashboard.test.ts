import { describe, expect, it } from "vitest";
import { dashboardQuerySchema, dayKey, fillDays, lastDays } from "./dashboard";

describe("dashboard days", () => {
  // 01:30 on 3 Nov in Dhaka (UTC+6) is still 2 Nov in UTC.
  const now = new Date("2026-11-02T19:30:00Z");

  it("names days in the viewer's time zone", () => {
    expect(dayKey(now, "UTC")).toBe("2026-11-02");
    expect(dayKey(now, "Asia/Dhaka")).toBe("2026-11-03");
  });

  it("lists the last N days, oldest first, ending today", () => {
    expect(lastDays(now, 3, "Asia/Dhaka")).toEqual(["2026-11-01", "2026-11-02", "2026-11-03"]);
    expect(lastDays(now, 30, "UTC")).toHaveLength(30);
  });

  it("fills quiet days with zeros and ignores days outside the range", () => {
    const days = lastDays(now, 3, "UTC");
    const rows = [
      { day: "2026-11-02", count: 2 },
      { day: "2026-10-31", count: 1 },
      { day: "2026-10-20", count: 9 },
    ];
    expect(fillDays(rows, days)).toEqual([
      { date: "2026-10-31", value: 1 },
      { date: "2026-11-01", value: 0 },
      { date: "2026-11-02", value: 2 },
    ]);
  });

  it("accepts known time zones only", () => {
    expect(dashboardQuerySchema.parse({})).toEqual({ range: "week", tz: "UTC" });
    expect(dashboardQuerySchema.safeParse({ tz: "Asia/Dhaka", range: "month" }).success).toBe(true);
    expect(dashboardQuerySchema.safeParse({ tz: "Mars/Olympus" }).success).toBe(false);
    expect(dashboardQuerySchema.safeParse({ range: "year" }).success).toBe(false);
  });
});
