/** "2 hrs remaining", "in 3 days", "now", "ended": the Figma interview countdown. */
export function untilLabel(startIso: string, endIso: string, now = Date.now()): string {
  const start = Date.parse(startIso);
  const end = Date.parse(endIso);
  if (now >= end) return "Ended";
  if (now >= start) return "Happening now";
  const minutes = Math.round((start - now) / 60_000);
  if (minutes < 60) return `${minutes} min remaining`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hr" : "hrs"} remaining`;
  const days = Math.round(hours / 24);
  if (days < 14) return `in ${days} ${days === 1 ? "day" : "days"}`;
  return `in ${Math.round(days / 7)} weeks`;
}

/** Local date and time, e.g. "Mon, 3 Nov · 14:30". */
export function formatWhen(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })} · ${d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`;
}

/** Value for <input type="datetime-local"> from an ISO string (local time). */
export function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
