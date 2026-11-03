import { FILLER_WORDS, SYNONYM_GROUPS } from "./synonyms";

/** One thing the searcher asked for, with the other ways of saying it. Every term must match. */
export interface SearchTerm {
  /** As typed (normalised), e.g. "frontend". */
  text: string;
  /** The term and its synonyms; multi-word ones are matched as phrases. */
  alternatives: string[];
}

const MAX_TERMS = 6;

/** Lower case, punctuation to spaces (keeping + # . inside words, as in c++, c#, node.js). */
function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, " ")
    .replace(/(^|\s)[.-]+|[.-]+(?=\s|$)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const groupOf = new Map<string, string[]>();
for (const group of SYNONYM_GROUPS) for (const word of group) groupOf.set(word, group);
// Longest phrases first, so "software engineer" wins over "engineer".
const phrases = [...groupOf.keys()]
  .filter((w) => w.includes(" "))
  .sort((a, b) => b.length - a.length);

/** Splits a search into terms, dropping filler words and adding synonyms. */
export function parseSearch(text: string): SearchTerm[] {
  let rest = ` ${normalise(text)} `;
  const terms: SearchTerm[] = [];
  for (const phrase of phrases) {
    if (!rest.includes(` ${phrase} `)) continue;
    terms.push({ text: phrase, alternatives: groupOf.get(phrase)! });
    rest = rest.replaceAll(` ${phrase} `, " ");
  }
  for (const word of rest.split(" ")) {
    if (!word || FILLER_WORDS.has(word) || terms.some((t) => t.text === word)) continue;
    // Plurals share their singular's synonyms ("engineers" -> engineer, developer…).
    const group =
      groupOf.get(word) ?? (word.endsWith("s") ? groupOf.get(word.slice(0, -1)) : undefined);
    terms.push({ text: word, alternatives: group ?? [word] });
  }
  return terms.slice(0, MAX_TERMS);
}

/** How many letters a word may be off and still count (none for short words). */
export function typoAllowance(word: string): number {
  if (word.length <= 3) return 0;
  return word.length <= 5 ? 1 : 2;
}
