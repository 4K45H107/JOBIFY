import { z } from "zod";

export const EmploymentStatus = z.enum(["STUDENT", "EMPLOYED", "UNEMPLOYED", "FREELANCE"]);
export type EmploymentStatus = z.infer<typeof EmploymentStatus>;

export const JobType = z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP"]);
export type JobType = z.infer<typeof JobType>;

export const Workplace = z.enum(["ONSITE", "REMOTE", "HYBRID"]);
export type Workplace = z.infer<typeof Workplace>;

/** Optional free text: trimmed, empty string means "clear it". */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

export const seekerProfileUpdateSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(80).optional(),
  headline: optionalText(120),
  phone: optionalText(30),
  /** YYYY-MM-DD. Must be at least 14 years ago. */
  birthdate: z.iso
    .date("Use the format YYYY-MM-DD")
    .refine(
      (d) => new Date(d) <= new Date(Date.now() - 14 * 365.25 * 86_400_000),
      "You must be at least 14",
    )
    .nullable()
    .optional(),
  location: optionalText(80),
  education: optionalText(120),
  about: optionalText(2000),
  employmentStatus: EmploymentStatus.nullable().optional(),
  currentPosition: optionalText(80),
  experienceYears: z.number().int().min(0).max(60).nullable().optional(),
});
export type SeekerProfileUpdate = z.infer<typeof seekerProfileUpdateSchema>;

export const skillName = z.string().trim().min(1).max(40);

export const skillsUpdateSchema = z.object({
  skills: z
    .array(skillName)
    .max(30, "Add at most 30 skills")
    // Case-insensitive de-duplication, keeping the first spelling.
    .transform((list) => {
      const seen = new Set<string>();
      return list.filter((s) => !seen.has(s.toLowerCase()) && seen.add(s.toLowerCase()));
    }),
});
export type SkillsUpdate = z.infer<typeof skillsUpdateSchema>;

export const jobPreferenceSchema = z.object({
  titles: z.array(z.string().trim().min(1).max(60)).max(10),
  locations: z.array(z.string().trim().min(1).max(60)).max(10),
  jobTypes: z.array(JobType).max(JobType.options.length),
  workplace: z.array(Workplace).max(Workplace.options.length),
  minSalary: z.number().int().min(0).max(10_000_000).nullable(),
});
export type JobPreference = z.infer<typeof jobPreferenceSchema>;

export const seekerProfileSchema = z.object({
  fullName: z.string(),
  email: z.string(),
  headline: z.string().nullable(),
  phone: z.string().nullable(),
  birthdate: z.string().nullable(),
  location: z.string().nullable(),
  education: z.string().nullable(),
  about: z.string().nullable(),
  employmentStatus: EmploymentStatus.nullable(),
  currentPosition: z.string().nullable(),
  experienceYears: z.number().nullable(),
  /** Paths under /api/files; null when nothing is uploaded. */
  cvUrl: z.string().nullable(),
  photoUrl: z.string().nullable(),
  skills: z.array(z.string()),
  preferences: jobPreferenceSchema,
});
export type SeekerProfile = z.infer<typeof seekerProfileSchema>;

export const employerProfileUpdateSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(80).optional(),
  designation: optionalText(80),
  phone: optionalText(30),
});
export type EmployerProfileUpdate = z.infer<typeof employerProfileUpdateSchema>;

export const employerProfileSchema = z.object({
  fullName: z.string(),
  email: z.string(),
  designation: z.string().nullable(),
  phone: z.string().nullable(),
  photoUrl: z.string().nullable(),
});
export type EmployerProfile = z.infer<typeof employerProfileSchema>;

/** Upload limits shared by the API (enforced) and web (early feedback). */
export const UPLOAD_LIMITS = {
  cv: { maxBytes: 5 * 1024 * 1024, types: ["application/pdf"] },
  image: { maxBytes: 2 * 1024 * 1024, types: ["image/png", "image/jpeg", "image/webp"] },
} as const;
