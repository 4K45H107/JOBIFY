import { z } from "zod";

export const mcqQuestionInput = z
  .object({
    prompt: z.string().trim().min(5, "Write the question").max(300),
    options: z
      .array(z.string().trim().min(1, "Options can't be empty").max(200))
      .min(2, "Give at least two options")
      .max(6, "Use at most six options"),
    correctIndex: z.number().int().min(0),
  })
  .refine((q) => q.correctIndex < q.options.length, {
    message: "Pick the correct answer",
    path: ["correctIndex"],
  })
  .refine((q) => new Set(q.options.map((o) => o.toLowerCase())).size === q.options.length, {
    message: "Options must be different",
    path: ["options"],
  });
export type McqQuestionInput = z.infer<typeof mcqQuestionInput>;

export const assessmentInput = z.object({
  title: z.string().trim().min(3, "Give the test a title").max(100),
  timeLimitMin: z.number().int().min(1, "At least 1 minute").max(180, "At most 3 hours"),
  questions: z
    .array(mcqQuestionInput)
    .min(1, "Add at least one question")
    .max(50, "Use at most 50 questions"),
});
export type AssessmentInput = z.infer<typeof assessmentInput>;

/** The full test, answer key included. Only ever sent to the hiring team. */
export const teamAssessmentSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  title: z.string(),
  timeLimitMin: z.number(),
  questions: z.array(
    z.object({
      id: z.string(),
      prompt: z.string(),
      options: z.array(z.string()),
      correctIndex: z.number(),
    }),
  ),
  /** True once anyone has submitted; questions can't change after that. */
  locked: z.boolean(),
  stats: z.object({
    started: z.number(),
    submitted: z.number(),
    averageScore: z.number().nullable(),
  }),
});
export type TeamAssessment = z.infer<typeof teamAssessmentSchema>;

/** What a seeker sees while taking the test: no answer key. */
export const attemptSchema = z.object({
  id: z.string(),
  applicationId: z.string(),
  title: z.string(),
  timeLimitMin: z.number(),
  startedAt: z.string(),
  deadline: z.string(),
  submittedAt: z.string().nullable(),
  score: z.number().nullable(),
  questions: z.array(
    z.object({ id: z.string(), prompt: z.string(), options: z.array(z.string()) }),
  ),
  /** The seeker's chosen option per question, once submitted. */
  answers: z.record(z.string(), z.number().nullable()).nullable(),
});
export type Attempt = z.infer<typeof attemptSchema>;

export const submitAttemptSchema = z.object({
  answers: z
    .array(
      z.object({ questionId: z.string().min(1), optionIndex: z.number().int().min(0).nullable() }),
    )
    .max(50),
});
export type SubmitAttempt = z.infer<typeof submitAttemptSchema>;
