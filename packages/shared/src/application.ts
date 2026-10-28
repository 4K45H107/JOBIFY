import { z } from "zod";
import { emailSchema } from "./auth";
import { jobSummarySchema } from "./job";

export const ApplicationStage = z.enum([
  "APPLIED",
  "TESTING",
  "SHORTLISTED",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
  "WITHDRAWN",
]);
export type ApplicationStage = z.infer<typeof ApplicationStage>;

/**
 * Moves the hiring team may make. WITHDRAWN is the seeker's own action;
 * OFFER and WITHDRAWN are final.
 */
export const STAGE_TRANSITIONS: Record<ApplicationStage, ApplicationStage[]> = {
  APPLIED: ["SHORTLISTED", "REJECTED"],
  TESTING: ["SHORTLISTED", "REJECTED"],
  SHORTLISTED: ["INTERVIEW", "OFFER", "REJECTED"],
  INTERVIEW: ["OFFER", "REJECTED", "SHORTLISTED"],
  OFFER: [],
  REJECTED: ["SHORTLISTED"],
  WITHDRAWN: [],
};

export const canMoveTo = (from: ApplicationStage, to: ApplicationStage) =>
  STAGE_TRANSITIONS[from].includes(to);

/** Stages a seeker may still withdraw from. */
export const WITHDRAWABLE: ApplicationStage[] = ["APPLIED", "TESTING", "SHORTLISTED", "INTERVIEW"];

export const contactSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(80),
  email: emailSchema,
  phone: z.string().trim().min(5, "Enter a phone number").max(30),
});
export type Contact = z.infer<typeof contactSchema>;

export const applySchema = z.object({
  contact: contactSchema,
  answers: z
    .array(z.object({ questionId: z.string().min(1), answer: z.string().trim().max(1000) }))
    .max(10)
    .default([]),
});
export type ApplyInput = z.infer<typeof applySchema>;

export const stageChangeSchema = z.object({
  stage: ApplicationStage,
  note: z.string().trim().max(500).optional(),
});
export type StageChange = z.infer<typeof stageChangeSchema>;

export const stageEventSchema = z.object({
  from: ApplicationStage.nullable(),
  to: ApplicationStage,
  at: z.string(),
  note: z.string().nullable(),
});

const testStatusSchema = z.object({
  /** null when the job has no test. */
  state: z.enum(["NOT_STARTED", "IN_PROGRESS", "SUBMITTED"]).nullable(),
  score: z.number().nullable(),
});

/** A seeker's own application, as listed in Activities > Applications. */
export const myApplicationSchema = z.object({
  id: z.string(),
  stage: ApplicationStage,
  appliedAt: z.string(),
  updatedAt: z.string(),
  job: jobSummarySchema,
  test: testStatusSchema,
  history: z.array(stageEventSchema),
});
export type MyApplication = z.infer<typeof myApplicationSchema>;

export const myApplicationsSchema = z.object({
  items: z.array(myApplicationSchema),
  counts: z.record(ApplicationStage, z.number()),
});
export type MyApplications = z.infer<typeof myApplicationsSchema>;

/** An applicant as the hiring team sees them (Figma "Job Management"). */
export const applicantSchema = z.object({
  id: z.string(),
  stage: ApplicationStage,
  appliedAt: z.string(),
  /** Stored data, so plain strings: the input rules may have changed since it was saved. */
  contact: z.object({ fullName: z.string(), email: z.string(), phone: z.string() }),
  cvUrl: z.string(),
  seeker: z.object({
    id: z.string(),
    fullName: z.string(),
    photoUrl: z.string().nullable(),
    headline: z.string().nullable(),
    currentPosition: z.string().nullable(),
    employmentStatus: z.string().nullable(),
    experienceYears: z.number().nullable(),
    location: z.string().nullable(),
    skills: z.array(z.string()),
  }),
  answers: z.array(z.object({ questionId: z.string(), prompt: z.string(), answer: z.string() })),
  test: testStatusSchema,
  history: z.array(stageEventSchema),
});
export type Applicant = z.infer<typeof applicantSchema>;

export const ApplicantSort = z.enum(["date", "score", "experience"]);
export type ApplicantSort = z.infer<typeof ApplicantSort>;

export const applicantsQuerySchema = z.object({
  stage: ApplicationStage.optional(),
  sort: ApplicantSort.default("date"),
});
export type ApplicantsQuery = z.infer<typeof applicantsQuerySchema>;
