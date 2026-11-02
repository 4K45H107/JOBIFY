import { MAX_CODING_TESTS } from "@jobify/shared";
import { describe, expect, it } from "vitest";
import {
  getProblem,
  getTests,
  listProblems,
  listTopics,
  outputsMatch,
  PROBLEM_DEFINITIONS,
} from "./index";

describe("coding problem library", () => {
  it("has 30 problems with unique slugs across all three difficulties", () => {
    expect(PROBLEM_DEFINITIONS).toHaveLength(30);
    expect(new Set(PROBLEM_DEFINITIONS.map((p) => p.slug)).size).toBe(30);
    const count = (d: string) => PROBLEM_DEFINITIONS.filter((p) => p.difficulty === d).length;
    expect([count("EASY"), count("MEDIUM"), count("HARD")]).toEqual([10, 12, 8]);
  });

  it.each(PROBLEM_DEFINITIONS.map((p) => [p.slug]))(
    "%s: 2 samples, at most 10 tests, all distinct with real answers",
    (slug) => {
      const tests = getTests(slug);
      expect(tests.filter((t) => t.sample)).toHaveLength(2);
      expect(tests.length).toBeGreaterThanOrEqual(6);
      expect(tests.length).toBeLessThanOrEqual(MAX_CODING_TESTS);
      expect(new Set(tests.map((t) => t.input)).size).toBe(tests.length);
      for (const t of tests) {
        expect(t.input.endsWith("\n")).toBe(true);
        expect(t.expectedOutput).not.toMatch(/undefined|NaN|Infinity/);
        // Small enough to send to a code runner later.
        expect(t.input.length).toBeLessThan(64_000);
      }
    },
  );

  it("builds the same hidden tests every time", () => {
    const def = PROBLEM_DEFINITIONS.find((p) => p.slug === "two-sum")!;
    expect(getTests("two-sum")).toEqual(getTests("two-sum"));
    expect(def.hidden).toBeTypeOf("function");
  });

  it("solves the samples with the answers a person would expect", () => {
    const samples = (slug: string) => getProblem(slug)!.samples.map((s) => s.output);
    expect(samples("sum-of-two-integers")).toEqual(["8", "-5"]);
    expect(samples("fizzbuzz")[1]!.split("\n").at(-1)).toBe("FizzBuzz");
    expect(samples("palindrome-check")).toEqual(["YES", "NO"]);
    expect(samples("second-largest")).toEqual(["4", "NONE"]);
    expect(samples("two-sum")).toEqual(["1 2", "-1"]);
    expect(samples("balanced-brackets")).toEqual(["YES", "NO"]);
    expect(samples("merge-intervals")[0]).toBe("3\n1 6\n8 10\n15 18");
    expect(samples("spiral-matrix")[0]).toBe("1 2 3 6 9 8 7 4 5");
    expect(samples("maximum-subarray")).toEqual(["6", "-1"]);
    expect(samples("longest-increasing-subsequence")).toEqual(["4", "1"]);
    expect(samples("coin-change")).toEqual(["3", "-1"]);
    expect(samples("edit-distance")).toEqual(["3", "5"]);
    expect(samples("grid-shortest-path")).toEqual(["5", "-1"]);
    expect(samples("number-of-islands")).toEqual(["3", "2"]);
    expect(samples("shortest-route")).toEqual(["8", "-1"]);
    expect(samples("longest-common-subsequence")).toEqual(["3", "0"]);
    expect(samples("knapsack")).toEqual(["220", "0"]);
  });

  it("never shows hidden tests in the candidate view", () => {
    const problem = getProblem("knapsack")!;
    expect(problem.samples).toHaveLength(2);
    expect(problem.hiddenTests).toBe(getTests("knapsack").length - 2);
    expect(JSON.stringify(problem)).not.toContain(getTests("knapsack")[2]!.input.trim());
  });

  it("lists and filters, easiest first", () => {
    const all = listProblems();
    expect(all).toHaveLength(30);
    expect(all[0]!.difficulty).toBe("EASY");
    expect(all.at(-1)!.difficulty).toBe("HARD");
    expect(listProblems({ difficulty: "HARD" })).toHaveLength(8);
    expect(listProblems({ topic: "graphs" }).map((p) => p.slug)).toContain("shortest-route");
    expect(listProblems({ q: "BRACKET" }).map((p) => p.slug)).toEqual(["balanced-brackets"]);
    expect(listTopics()).toContain("dynamic-programming");
    expect(getProblem("nope")).toBeNull();
  });

  it("compares outputs ignoring trailing whitespace only", () => {
    expect(outputsMatch("1 2  \n3\n\n", "1 2\n3")).toBe(true);
    expect(outputsMatch("1\r\n2", "1\n2")).toBe(true);
    expect(outputsMatch(" 1", "1")).toBe(false);
    expect(outputsMatch("12", "1 2")).toBe(false);
  });
});
