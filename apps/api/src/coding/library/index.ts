import {
  type CodingProblem,
  type CodingProblemQuery,
  type CodingProblemSummary,
  MAX_CODING_TESTS,
} from "@jobify/shared";
import { easyProblems } from "./easy";
import { hardProblems } from "./hard";
import { mediumProblems } from "./medium";
import { createRng } from "./rng";
import type { ProblemDefinition } from "./types";

export const PROBLEM_DEFINITIONS: ProblemDefinition[] = [
  ...easyProblems,
  ...mediumProblems,
  ...hardProblems,
];

export interface TestCase {
  input: string;
  expectedOutput: string;
  sample: boolean;
}

interface BuiltProblem {
  problem: CodingProblem;
  tests: TestCase[];
}

/** "Read two integers a and b and print their sum." from a longer statement. */
const firstSentence = (text: string) => text.match(/^.*?[.!?](\s|$)/)?.[0].trim() ?? text;

function build(def: ProblemDefinition): BuiltProblem {
  const samples = def.samples.map((s) => ({ ...s, output: def.solve(s.input) }));
  const hidden = def
    .hidden(createRng(def.slug))
    .slice(0, MAX_CODING_TESTS - samples.length)
    .map((input) => ({ input, expectedOutput: def.solve(input), sample: false }));
  const summary: CodingProblemSummary = {
    slug: def.slug,
    title: def.title,
    difficulty: def.difficulty,
    topics: def.topics,
    summary: firstSentence(def.statement),
  };
  return {
    problem: {
      ...summary,
      statement: def.statement,
      inputFormat: def.inputFormat,
      outputFormat: def.outputFormat,
      constraints: def.constraints,
      samples: samples.map((s) => ({
        input: s.input,
        output: s.output,
        explanation: s.explanation ?? null,
      })),
      hiddenTests: hidden.length,
    },
    tests: [
      ...samples.map((s) => ({ input: s.input, expectedOutput: s.output, sample: true })),
      ...hidden,
    ],
  };
}

// Built on first use and kept: the reference solutions are deterministic and quick.
let built: Map<string, BuiltProblem> | null = null;
const library = () => (built ??= new Map(PROBLEM_DEFINITIONS.map((d) => [d.slug, build(d)])));

const DIFFICULTY_ORDER = { EASY: 0, MEDIUM: 1, HARD: 2 } as const;

/** The library, easiest first, filtered by difficulty, topic and title/topic text. */
export function listProblems(query: CodingProblemQuery = {}): CodingProblemSummary[] {
  const q = query.q?.toLowerCase();
  return [...library().values()]
    .map((b) => b.problem)
    .filter((p) => !query.difficulty || p.difficulty === query.difficulty)
    .filter((p) => !query.topic || p.topics.includes(query.topic))
    .filter((p) => !q || p.title.toLowerCase().includes(q) || p.topics.some((t) => t.includes(q)))
    .sort((a, b) => DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty])
    .map(({ slug, title, difficulty, topics, summary }) => ({
      slug,
      title,
      difficulty,
      topics,
      summary,
    }));
}

/** Every topic used in the library, for the filter. */
export function listTopics(): string[] {
  return [...new Set(PROBLEM_DEFINITIONS.flatMap((d) => d.topics))].sort();
}

/** The candidate-safe view: statement and samples only. */
export function getProblem(slug: string): CodingProblem | null {
  return library().get(slug)?.problem ?? null;
}

/** All tests, hidden ones included. Server-side only (for grading). */
export function getTests(slug: string): TestCase[] {
  return library().get(slug)?.tests ?? [];
}

/** Compares a program's output with the expected one, ignoring trailing spaces and blank lines. */
export function outputsMatch(actual: string, expected: string): boolean {
  const normalise = (s: string) =>
    s
      .replace(/\r/g, "")
      .split("\n")
      .map((line) => line.trimEnd())
      .join("\n")
      .trimEnd();
  return normalise(actual) === normalise(expected);
}
