/** Grace period for network delay after the time limit. */
export const SUBMIT_GRACE_MS = 60_000;

export function deadlineOf(startedAt: Date, timeLimitMin: number): Date {
  return new Date(startedAt.getTime() + timeLimitMin * 60_000);
}

export function isLate(startedAt: Date, timeLimitMin: number, now = new Date()): boolean {
  return now.getTime() > deadlineOf(startedAt, timeLimitMin).getTime() + SUBMIT_GRACE_MS;
}

/**
 * Percentage of questions answered correctly, rounded to one decimal.
 * Unknown question ids are ignored; unanswered questions count as wrong.
 */
export function grade(
  questions: { id: string; correctIndex: number }[],
  answers: { questionId: string; optionIndex: number | null }[],
): { score: number; byQuestion: Record<string, number | null> } {
  const chosen = new Map(answers.map((a) => [a.questionId, a.optionIndex]));
  const byQuestion: Record<string, number | null> = {};
  let correct = 0;
  for (const q of questions) {
    const pick = chosen.get(q.id) ?? null;
    byQuestion[q.id] = pick;
    if (pick === q.correctIndex) correct++;
  }
  const score = questions.length === 0 ? 0 : Math.round((correct / questions.length) * 1000) / 10;
  return { score, byQuestion };
}
