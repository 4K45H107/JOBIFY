import { z } from "zod";
import { MembershipStatus } from "./auth";

export const CompanySize = z.enum([
  "SIZE_1_10",
  "SIZE_11_50",
  "SIZE_51_200",
  "SIZE_201_1000",
  "SIZE_1001_10000",
  "SIZE_10000_PLUS",
]);
export type CompanySize = z.infer<typeof CompanySize>;

export const COMPANY_SIZE_LABELS: Record<CompanySize, string> = {
  SIZE_1_10: "1–10 employees",
  SIZE_11_50: "11–50 employees",
  SIZE_51_200: "51–200 employees",
  SIZE_201_1000: "201–1,000 employees",
  SIZE_1001_10000: "1,001–10,000 employees",
  SIZE_10000_PLUS: "10,000+ employees",
};

export const CompanyRole = z.enum(["ADMIN", "RECRUITER"]);
export type CompanyRole = z.infer<typeof CompanyRole>;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

export const companyCreateSchema = z.object({
  name: z.string().trim().min(2, "Enter the company name").max(80),
  industry: optionalText(60),
  size: CompanySize.nullable().optional(),
  foundedYear: z.number().int().min(1800).max(new Date().getFullYear()).nullable().optional(),
  website: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .pipe(
      z
        .url({ protocol: /^https?$/, message: "Enter a full URL, e.g. https://example.com" })
        .nullable(),
    )
    .optional(),
  headquarters: optionalText(80),
  description: optionalText(4000),
  mission: optionalText(500),
});
export type CompanyCreate = z.infer<typeof companyCreateSchema>;

export const companyUpdateSchema = companyCreateSchema.partial();
export type CompanyUpdate = z.infer<typeof companyUpdateSchema>;

export const branchCreateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  city: z.string().trim().min(1).max(60),
  country: z.string().trim().min(2).max(60),
});
export type BranchCreate = z.infer<typeof branchCreateSchema>;

export const branchSchema = branchCreateSchema.extend({ id: z.string() });
export type Branch = z.infer<typeof branchSchema>;

export const companySummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  industry: z.string().nullable(),
  size: CompanySize.nullable(),
  headquarters: z.string().nullable(),
  description: z.string().nullable(),
  logoUrl: z.string().nullable(),
  openJobs: z.number(),
  employees: z.number(),
});
export type CompanySummary = z.infer<typeof companySummarySchema>;

export const companyDetailSchema = companySummarySchema.extend({
  foundedYear: z.number().nullable(),
  website: z.string().nullable(),
  mission: z.string().nullable(),
  coverUrl: z.string().nullable(),
  branches: z.array(branchSchema),
});
export type CompanyDetail = z.infer<typeof companyDetailSchema>;

export const companyListQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});
export type CompanyListQuery = z.infer<typeof companyListQuerySchema>;

export const paginated = <T extends z.ZodTypeAny>(item: T) =>
  z.object({ items: z.array(item), total: z.number(), page: z.number(), pageSize: z.number() });

export const companyListSchema = paginated(companySummarySchema);
export type CompanyList = z.infer<typeof companyListSchema>;

export const companyMemberSchema = z.object({
  userId: z.string(),
  fullName: z.string(),
  email: z.string(),
  designation: z.string().nullable(),
  photoUrl: z.string().nullable(),
  role: CompanyRole,
  status: MembershipStatus,
  requestedAt: z.string(),
});
export type CompanyMember = z.infer<typeof companyMemberSchema>;

export const memberListQuerySchema = z.object({ status: MembershipStatus.optional() });
