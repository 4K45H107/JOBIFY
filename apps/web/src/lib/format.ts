const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

/** 110000, 140000 -> "$110K–$140K" (Figma shows yearly ranges like "$110k-$140k"). */
export function formatSalary(min: number, max: number): string {
  const fmt = (n: number) => `$${compact.format(n)}`;
  return min === max ? fmt(min) : `${fmt(min)}–${fmt(max)}`;
}

/** Short age like the Figma cards: "5s", "3m", "2h", "1d", "3w", "4mo". */
export function timeAgo(iso: string, now = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  const steps: [number, string][] = [
    [60, "s"],
    [60, "m"],
    [24, "h"],
    [7, "d"],
    [4.35, "w"],
    [12, "mo"],
  ];
  let value = seconds;
  for (const [size, unit] of steps) {
    if (value < size) return `${Math.floor(value)}${unit}`;
    value /= size;
  }
  return `${Math.floor(value)}y`;
}

export function formatPlace(city: string | null, country: string): string {
  return city ? `${city}, ${country}` : country;
}

export function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
