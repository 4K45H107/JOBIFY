import type { CodingDifficulty } from "@jobify/shared";
import type { Rng } from "./rng";

/**
 * A library problem. Standard input in, standard output out. Expected outputs are never written
 * by hand: they come from running `solve` (our own trusted reference solution) on each input.
 */
export interface ProblemDefinition {
  slug: string;
  title: string;
  difficulty: CodingDifficulty;
  topics: string[];
  statement: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string[];
  /** Shown to candidates, with an optional explanation. */
  samples: { input: string; explanation?: string }[];
  /** Hidden test inputs; samples + hidden never exceed MAX_CODING_TESTS. */
  hidden: (rng: Rng) => string[];
  solve: (input: string) => string;
}

/** Whitespace-separated tokens of the input. */
export const tokens = (input: string): string[] => input.trim().split(/\s+/).filter(Boolean);

/** Lines of the input without trailing carriage returns. */
export const lines = (input: string): string[] => input.replace(/\r/g, "").split("\n");

/** Numbers of the input, in order. */
export const numbers = (input: string): number[] => tokens(input).map(Number);
