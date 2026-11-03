# 0006. Coding problems as code; grading deferred

**Status:** accepted

## Context

Employers needed coding tests without writing problems and test cases themselves. Scraping problem
sites would break their terms and copyright, and their hidden tests aren't public anyway. Running
candidates' code needs an isolated sandbox, and Judge0 no longer has a free hosted plan.

## Decision

- **Library:** 30 original problems live in the API's code. Each has a reference solution and a
  seeded input generator, so test cases (at most 10) are computed, never typed, and hidden tests
  never reach a browser.
- **Submitting:** candidates write code in a Monaco editor and submit it, and the hiring team reads
  it.
- **Grading:** waits for a code runner. The integration is designed in `docs/CODE_RUNNER.md`.

## Consequences

- Employers pick a problem in two clicks, at no cost.
- Coding answers have no automatic score yet.
- When a runner is added (self-hosted Judge0 is the free route), the tests and the output comparison
  already exist.
