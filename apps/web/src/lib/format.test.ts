import { describe, expect, it } from "vitest";
import { formatPlace, formatSalary, timeAgo } from "./format";

describe("formatSalary", () => {
  it("formats compact ranges", () => {
    expect(formatSalary(110_000, 140_000)).toBe("$110K–$140K");
    expect(formatSalary(1_500_000, 1_500_000)).toBe("$1.5M");
  });
});

describe("timeAgo", () => {
  const now = Date.parse("2026-10-29T12:00:00Z");
  it.each([
    ["2026-10-29T11:59:55Z", "5s"],
    ["2026-10-29T11:57:00Z", "3m"],
    ["2026-10-29T10:00:00Z", "2h"],
    ["2026-10-28T12:00:00Z", "1d"],
    ["2026-10-08T12:00:00Z", "3w"],
    ["2026-06-01T12:00:00Z", "4mo"],
    ["2024-01-01T12:00:00Z", "2y"],
  ])("%s -> %s", (iso, expected) => {
    expect(timeAgo(iso, now)).toBe(expected);
  });
});

describe("formatPlace", () => {
  it("omits a missing city", () => {
    expect(formatPlace(null, "Germany")).toBe("Germany");
    expect(formatPlace("Dhaka", "Bangladesh")).toBe("Dhaka, Bangladesh");
  });
});
