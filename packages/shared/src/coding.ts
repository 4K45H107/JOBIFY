import { z } from "zod";

/** Languages a candidate can answer a coding problem in. */
export const CodingLanguage = z.enum(["python", "javascript", "cpp", "java"]);
export type CodingLanguage = z.infer<typeof CodingLanguage>;

export const CODING_LANGUAGE_LABELS: Record<CodingLanguage, string> = {
  python: "Python 3",
  javascript: "JavaScript (Node.js)",
  cpp: "C++17",
  java: "Java 17",
};

/** Starter code: read all of standard input, print the answer. */
export const CODING_STARTER_CODE: Record<CodingLanguage, string> = {
  python: `import sys

def main():
    data = sys.stdin.read().split()
    # Your solution here
    print()

main()
`,
  javascript: `const data = require("fs").readFileSync(0, "utf8").trim().split(/\\s+/);

// Your solution here
console.log();
`,
  cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    // Your solution here
    return 0;
}
`,
  java: `import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader in = new BufferedReader(new InputStreamReader(System.in));
        // Your solution here
    }
}
`,
};

export const CodingDifficulty = z.enum(["EASY", "MEDIUM", "HARD"]);
export type CodingDifficulty = z.infer<typeof CodingDifficulty>;

export const CODING_DIFFICULTY_LABELS: Record<CodingDifficulty, string> = {
  EASY: "Easy",
  MEDIUM: "Medium",
  HARD: "Hard",
};

/** A problem has at most this many test cases, samples included. */
export const MAX_CODING_TESTS = 10;
/** Submitted code is capped well above any reasonable solution. */
export const MAX_CODE_LENGTH = 50_000;

export const codingSampleSchema = z.object({
  input: z.string(),
  output: z.string(),
  explanation: z.string().nullable(),
});
export type CodingSample = z.infer<typeof codingSampleSchema>;

/** A library problem as listed for employers. */
export const codingProblemSummarySchema = z.object({
  slug: z.string(),
  title: z.string(),
  difficulty: CodingDifficulty,
  topics: z.array(z.string()),
  /** First sentence of the statement, for the list. */
  summary: z.string(),
});
export type CodingProblemSummary = z.infer<typeof codingProblemSummarySchema>;

/** Everything a candidate sees: the statement and the sample tests (never the hidden ones). */
export const codingProblemSchema = codingProblemSummarySchema.extend({
  statement: z.string(),
  inputFormat: z.string(),
  outputFormat: z.string(),
  constraints: z.array(z.string()),
  samples: z.array(codingSampleSchema),
  /** How many more tests are kept back for grading. */
  hiddenTests: z.number(),
});
export type CodingProblem = z.infer<typeof codingProblemSchema>;

export const codingProblemListSchema = z.object({
  items: z.array(codingProblemSummarySchema),
  /** Every topic in the library, for the filter. */
  topics: z.array(z.string()),
});
export type CodingProblemList = z.infer<typeof codingProblemListSchema>;

export const codingProblemQuerySchema = z.object({
  difficulty: CodingDifficulty.optional(),
  topic: z.string().trim().max(40).optional(),
  q: z.string().trim().max(60).optional(),
});
export type CodingProblemQuery = z.infer<typeof codingProblemQuerySchema>;

/** Autosaved work in progress, so a reload or the time running out keeps the code. */
export const codingDraftSchema = z.object({
  language: CodingLanguage,
  code: z.string().max(MAX_CODE_LENGTH, "Your code is too long"),
});
export type CodingDraft = z.infer<typeof codingDraftSchema>;

/** A candidate's submitted solution, as the hiring team sees it. */
export const codingSubmissionSchema = z.object({
  applicationId: z.string(),
  candidate: z.string(),
  problem: codingProblemSummarySchema,
  language: CodingLanguage.nullable(),
  code: z.string().nullable(),
  submittedAt: z.string().nullable(),
  /** Submitted for them when the time ran out (their last autosave). */
  timedOut: z.boolean(),
});
export type CodingSubmission = z.infer<typeof codingSubmissionSchema>;
