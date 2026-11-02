import { z } from "zod";

/** The chart's time range: the last 7 or 30 days, one point per day. */
export const DashboardRange = z.enum(["week", "month"]);
export type DashboardRange = z.infer<typeof DashboardRange>;

export const DASHBOARD_RANGE_DAYS: Record<DashboardRange, number> = { week: 7, month: 30 };
export const DASHBOARD_RANGE_LABELS: Record<DashboardRange, string> = {
  week: "Last 7 days",
  month: "Last 30 days",
};

/** True for IANA time zone names the runtime knows, e.g. "Asia/Dhaka". */
export function isTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export const dashboardQuerySchema = z.object({
  range: DashboardRange.default("week"),
  /** The viewer's time zone, so "Monday" means their Monday. */
  tz: z.string().trim().max(64).refine(isTimeZone, "Unknown time zone").default("UTC"),
});
export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;

export const dashboardStatSchema = z.object({
  key: z.string(),
  label: z.string(),
  value: z.number(),
});
export type DashboardStat = z.infer<typeof dashboardStatSchema>;

export const dashboardSeriesSchema = z.object({
  key: z.string(),
  label: z.string(),
  /** One point per day, oldest first; `date` is YYYY-MM-DD in the viewer's time zone. */
  points: z.array(z.object({ date: z.string(), value: z.number() })),
});
export type DashboardSeries = z.infer<typeof dashboardSeriesSchema>;

export const dashboardSchema = z.object({
  range: DashboardRange,
  stats: z.array(dashboardStatSchema),
  series: z.array(dashboardSeriesSchema),
});
export type Dashboard = z.infer<typeof dashboardSchema>;

const DAY_MS = 24 * 60 * 60 * 1000;

/** YYYY-MM-DD of an instant in a time zone. */
export function dayKey(date: Date, timeZone: string): string {
  // en-CA formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** The last `days` calendar days in a time zone, oldest first, ending today. */
export function lastDays(now: Date, days: number, timeZone: string): string[] {
  const keys: string[] = [];
  // A 25-hour day around a DST change can land on the same date twice; keep it once.
  for (let i = days - 1; i >= 0; i--) {
    const key = dayKey(new Date(now.getTime() - i * DAY_MS), timeZone);
    if (keys.at(-1) !== key) keys.push(key);
  }
  return keys;
}

/** Earliest instant worth loading for a range: a day of slack covers any time zone offset. */
export function rangeStart(now: Date, days: number): Date {
  return new Date(now.getTime() - (days + 1) * DAY_MS);
}

/** Per-day counts from the database, with a zero for each day that had none. */
export function fillDays(
  rows: { day: string; count: number }[],
  days: string[],
): { date: string; value: number }[] {
  const counts = new Map(rows.map((r) => [r.day, r.count]));
  return days.map((date) => ({ date, value: counts.get(date) ?? 0 }));
}
