import type { QuestionKind } from "@jobify/shared";

export interface QuestionRule {
  id: string;
  prompt: string;
  kind: QuestionKind;
  required: boolean;
}

/**
 * Checks answers against the job's screening questions. Returns per-question error
 * messages (empty when valid) and the normalised answers to store.
 */
export function checkScreeningAnswers(
  questions: QuestionRule[],
  answers: { questionId: string; answer: string }[],
): { errors: Record<string, string>; normalised: { questionId: string; answer: string }[] } {
  const byId = new Map(answers.map((a) => [a.questionId, a.answer.trim()]));
  const errors: Record<string, string> = {};
  const normalised: { questionId: string; answer: string }[] = [];

  for (const unknown of byId.keys()) {
    if (!questions.some((q) => q.id === unknown)) errors[unknown] = "Not a question for this job";
  }

  for (const q of questions) {
    const raw = byId.get(q.id) ?? "";
    if (raw === "") {
      if (q.required) errors[q.id] = "This question needs an answer";
      continue;
    }
    if (q.kind === "YES_NO") {
      const v = raw.toLowerCase();
      if (v !== "yes" && v !== "no") {
        errors[q.id] = "Answer yes or no";
        continue;
      }
      normalised.push({ questionId: q.id, answer: v });
    } else if (q.kind === "NUMBER") {
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0) {
        errors[q.id] = "Enter a number";
        continue;
      }
      normalised.push({ questionId: q.id, answer: String(n) });
    } else {
      normalised.push({ questionId: q.id, answer: raw });
    }
  }
  return { errors, normalised };
}
