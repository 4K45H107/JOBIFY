/** Small helpers for the hand-drawn SVG charts (no chart library). */

export interface Point {
  x: number;
  y: number;
}

/** Round step sizes (1, 2, 5 × 10ⁿ), never below 1 since the charts show counts. */
function niceStep(raw: number): number {
  if (raw <= 1) return 1;
  const power = 10 ** Math.floor(Math.log10(raw));
  const unit = raw / power;
  return (unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 5 ? 5 : 10) * power;
}

/** Y-axis ticks from 0 up to just above `max`, about `count` steps. */
export function yTicks(max: number, count = 4): number[] {
  const step = niceStep(max / count);
  // At least a few rows even when everything is zero.
  const top = Math.max(step * Math.ceil(max / step), step === 1 ? count : step);
  const ticks: number[] = [];
  for (let v = 0; v <= top; v += step) ticks.push(v);
  return ticks;
}

/**
 * A smooth SVG path through the points that never overshoots them (monotone cubic,
 * Fritsch–Carlson), so a curve between two zero days never dips below the axis.
 */
export function smoothPath(points: Point[]): string {
  const n = points.length;
  if (n === 0) return "";
  if (n === 1) return `M${points[0]!.x},${points[0]!.y}`;

  const dx = (i: number) => points[i + 1]!.x - points[i]!.x;
  const slope = (i: number) => (points[i + 1]!.y - points[i]!.y) / dx(i);
  const tangents = points.map((_, i) => {
    if (i === 0) return slope(0);
    if (i === n - 1) return slope(n - 2);
    const a = slope(i - 1);
    const b = slope(i);
    // Flat at peaks, valleys and plateaus; otherwise a weighted harmonic mean.
    if (a * b <= 0) return 0;
    const wa = 2 * dx(i) + dx(i - 1);
    const wb = dx(i) + 2 * dx(i - 1);
    return (wa + wb) / (wa / a + wb / b);
  });

  let d = `M${points[0]!.x},${points[0]!.y}`;
  for (let i = 0; i < n - 1; i++) {
    const p = points[i]!;
    const q = points[i + 1]!;
    const third = dx(i) / 3;
    d += `C${p.x + third},${p.y + tangents[i]! * third} ${q.x - third},${q.y - tangents[i + 1]! * third} ${q.x},${q.y}`;
  }
  return d;
}

/** "2026-11-02" read as a calendar date (no time zone shift). */
const asDate = (day: string) => new Date(`${day}T12:00:00Z`);

/** "mon" for week charts, "2 Nov" for longer ones. */
export function dayLabel(day: string, short: boolean): string {
  return short
    ? asDate(day).toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" }).toLowerCase()
    : asDate(day).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

/** "Mon, 2 Nov" for tooltips and the table view. */
export function fullDayLabel(day: string): string {
  return asDate(day).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
