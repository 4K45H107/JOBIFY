import { describe, expect, it } from "vitest";
import { dayLabel, fullDayLabel, smoothPath, yTicks } from "./chart";

describe("yTicks", () => {
  it("uses whole-number steps for small counts", () => {
    expect(yTicks(0)).toEqual([0, 1, 2, 3, 4]);
    expect(yTicks(3)).toEqual([0, 1, 2, 3, 4]);
    expect(yTicks(5)).toEqual([0, 2, 4, 6]);
  });

  it("rounds larger counts to tidy steps", () => {
    expect(yTicks(37)).toEqual([0, 10, 20, 30, 40]);
    expect(yTicks(120)).toEqual([0, 50, 100, 150]);
  });
});

describe("smoothPath", () => {
  it("starts at the first point and ends at the last", () => {
    const d = smoothPath([
      { x: 0, y: 10 },
      { x: 10, y: 0 },
      { x: 20, y: 10 },
    ]);
    expect(d.startsWith("M0,10")).toBe(true);
    expect(d.endsWith("20,10")).toBe(true);
  });

  it("stays flat between equal points, so it never dips below the axis", () => {
    const d = smoothPath([
      { x: 0, y: 100 },
      { x: 10, y: 100 },
      { x: 20, y: 50 },
    ]);
    // The first segment's control points keep y at 100.
    expect(d).toMatch(/^M0,100C3\.33+\d*,100 6\.66+\d*,100 10,100/);
  });

  it("handles one point and none", () => {
    expect(smoothPath([])).toBe("");
    expect(smoothPath([{ x: 5, y: 5 }])).toBe("M5,5");
  });
});

describe("day labels", () => {
  it("names the calendar day without shifting time zones", () => {
    expect(dayLabel("2026-11-02", true)).toBe("mon");
    expect(dayLabel("2026-11-02", false)).toBe("2 Nov");
    expect(fullDayLabel("2026-11-02")).toBe("Mon 2 Nov");
  });
});
