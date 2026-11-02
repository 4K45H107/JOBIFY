/** A small seeded random generator, so hidden tests are the same on every server and every run. */
export interface Rng {
  /** Integer in [min, max]. */
  int(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  /** n integers in [min, max]. */
  ints(n: number, min: number, max: number): number[];
  /** A string of length n drawn from the given characters. */
  string(n: number, alphabet: string): string;
  /** A shuffled copy (Fisher–Yates). */
  shuffle<T>(items: readonly T[]): T[];
}

export function createRng(seedText: string): Rng {
  // Seed from the problem's slug (FNV-1a), then mulberry32.
  let seed = 2166136261;
  for (const ch of seedText) seed = Math.imul(seed ^ ch.charCodeAt(0), 16777619);
  const next = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min: number, max: number) => min + Math.floor(next() * (max - min + 1));
  return {
    int,
    pick: (items) => items[int(0, items.length - 1)]!,
    ints: (n, min, max) => Array.from({ length: n }, () => int(min, max)),
    shuffle: (items) => {
      const copy = [...items];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = int(0, i);
        [copy[i], copy[j]] = [copy[j]!, copy[i]!];
      }
      return copy;
    },
    string: (n, alphabet) =>
      Array.from({ length: n }, () => alphabet[int(0, alphabet.length - 1)]).join(""),
  };
}
