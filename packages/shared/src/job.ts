import { z } from "zod";
import { paginated } from "./company";
import { JobType, skillName, Workplace } from "./profile";

export const JobStatus = z.enum(["DRAFT", "OPEN", "CLOSED"]);
export type JobStatus = z.infer<typeof JobStatus>;

export const QuestionKind = z.enum(["YES_NO", "TEXT", "NUMBER"]);
export type QuestionKind = z.infer<typeof QuestionKind>;

export const screeningQuestionInput = z.object({
  prompt: z.string().trim().min(5, "Write the question").max(200),
  kind: QuestionKind,
  required: z.boolean().default(true),
});
export type ScreeningQuestionInput = z.infer<typeof screeningQuestionInput>;

const jobFields = z.object({
  title: z.string().trim().min(3, "Enter a job title").max(80),
  type: JobType,
  workplace: Workplace,
  country: z.string().trim().min(2, "Choose a country").max(60),
  city: z
    .string()
    .trim()
    .max(60)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  salaryMin: z.number({ error: "Enter the starting salary" }).int().min(0).max(10_000_000),
  salaryMax: z.number({ error: "Enter the top of the range" }).int().min(0).max(10_000_000),
  ageMin: z.number().int().min(14).max(100).nullable().optional(),
  ageMax: z.number().int().min(14).max(100).nullable().optional(),
  description: z.string().trim().min(30, "Describe the role in at least 30 characters").max(10_000),
  /** YYYY-MM-DD; applications close at the end of that day (UTC). */
  deadline: z.iso.date("Use the format YYYY-MM-DD").nullable().optional(),
  skills: z.array(skillName).max(15, "Add at most 15 skills").default([]),
  screeningQuestions: z
    .array(screeningQuestionInput)
    .max(10, "Add at most 10 questions")
    .default([]),
});

interface Ranges {
  salaryMin?: number;
  salaryMax?: number;
  ageMin?: number | null;
  ageMax?: number | null;
}

/** Cross-field checks shared by create and update (fields absent on update are skipped). */
const ranges = <T extends z.ZodType<Ranges>>(schema: T) =>
  schema
    .refine(
      (j) => j.salaryMin === undefined || j.salaryMax === undefined || j.salaryMax >= j.salaryMin,
      { message: "Maximum salary must be at least the minimum", path: ["salaryMax"] },
    )
    .refine((j) => j.ageMin == null || j.ageMax == null || j.ageMax >= j.ageMin, {
      message: "Maximum age must be at least the minimum",
      path: ["ageMax"],
    });

export const jobCreateSchema = ranges(
  jobFields.extend({ status: z.enum(["DRAFT", "OPEN"]).default("OPEN") }),
);
export type JobCreate = z.infer<typeof jobCreateSchema>;

export const jobUpdateSchema = ranges(
  jobFields
    .partial()
    .extend({ status: JobStatus.optional() })
    .omit({ skills: true, screeningQuestions: true })
    .extend({
      skills: z.array(skillName).max(15).optional(),
      screeningQuestions: z.array(screeningQuestionInput).max(10).optional(),
    }),
);
export type JobUpdate = z.infer<typeof jobUpdateSchema>;

export const jobCompanySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  logoUrl: z.string().nullable(),
});

export const jobSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  type: JobType,
  workplace: Workplace,
  country: z.string(),
  city: z.string().nullable(),
  salaryMin: z.number(),
  salaryMax: z.number(),
  status: JobStatus,
  deadline: z.string().nullable(),
  createdAt: z.string(),
  company: jobCompanySchema,
  skills: z.array(z.string()),
  hasAssessment: z.boolean(),
  /** Seeker-specific; false for employers. */
  saved: z.boolean(),
  applicants: z.number(),
});
export type JobSummary = z.infer<typeof jobSummarySchema>;

export const screeningQuestionSchema = screeningQuestionInput.extend({ id: z.string() });
export type ScreeningQuestion = z.infer<typeof screeningQuestionSchema>;

export const jobDetailSchema = jobSummarySchema.extend({
  description: z.string(),
  ageMin: z.number().nullable(),
  ageMax: z.number().nullable(),
  screeningQuestions: z.array(screeningQuestionSchema),
  postedBy: z.object({ id: z.string(), fullName: z.string() }),
  /** True when the caller is an active member of the hiring company. */
  canManage: z.boolean(),
  applied: z.boolean(),
});
export type JobDetail = z.infer<typeof jobDetailSchema>;

export const JobSort = z.enum(["latest", "trending", "salary"]);
export type JobSort = z.infer<typeof JobSort>;

const csv = <T extends z.ZodType<string, string>>(item: T) =>
  z
    .string()
    .optional()
    .transform((v) => (v ? v.split(",").filter(Boolean) : []))
    .pipe(z.array(item));

export const jobSearchQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  type: csv(JobType),
  workplace: csv(Workplace),
  location: z.string().trim().max(60).optional(),
  company: z.string().trim().max(80).optional(),
  /** Exact company, e.g. for a company's own page. */
  companySlug: z.string().trim().max(80).optional(),
  /** Jobs whose range reaches at least this salary. */
  salary: z.coerce.number().int().min(0).optional(),
  sort: JobSort.default("latest"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});
export type JobSearchQuery = z.infer<typeof jobSearchQuerySchema>;

export const jobListSchema = paginated(jobSummarySchema);
export type JobList = z.infer<typeof jobListSchema>;

export const recommendedJobSchema = jobSummarySchema.extend({
  score: z.number(),
  reasons: z.array(z.string()),
});
export type RecommendedJob = z.infer<typeof recommendedJobSchema>;

export const employerJobsQuerySchema = z.object({
  scope: z.enum(["mine", "company"]).default("company"),
  status: JobStatus.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});
export type EmployerJobsQuery = z.infer<typeof employerJobsQuerySchema>;

export const platformStatsSchema = z.object({
  openJobs: z.number(),
  companies: z.number(),
  seekers: z.number(),
});
export type PlatformStats = z.infer<typeof platformStatsSchema>;
