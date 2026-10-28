/**
 * Suffix that keeps each test file's data apart. Files run in parallel, so a
 * timestamp alone can collide and one file's cleanup would delete another's rows.
 */
export const uniqueRun = (): string =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
