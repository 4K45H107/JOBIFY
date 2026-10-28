import type { JobSummary } from "@jobify/shared";
import type { Prisma } from "@jobify/db";
import { fileUrl } from "../files/file-keys";

/** Relations needed to build a JobSummary for this viewer (their saved flag). */
export const summaryInclude = (viewerId: string) =>
  ({
    company: { select: { id: true, name: true, slug: true, logoKey: true } },
    skills: { include: { skill: true } },
    assessments: { select: { id: true } },
    savedBy: { where: { userId: viewerId }, select: { userId: true } },
    _count: { select: { applications: true } },
  }) satisfies Prisma.JobInclude;

export type JobWithSummary = Prisma.JobGetPayload<{ include: ReturnType<typeof summaryInclude> }>;

/** Prisma job (with summaryInclude) -> API JobSummary. */
export function toSummary(job: JobWithSummary): JobSummary {
  return {
    id: job.id,
    title: job.title,
    type: job.type,
    workplace: job.workplace,
    country: job.country,
    city: job.city,
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    status: job.status,
    deadline: job.deadline?.toISOString().slice(0, 10) ?? null,
    createdAt: job.createdAt.toISOString(),
    company: {
      id: job.company.id,
      name: job.company.name,
      slug: job.company.slug,
      logoUrl: fileUrl(job.company.logoKey),
    },
    skills: job.skills.map((s) => s.skill.name).sort(),
    hasAssessment: job.assessments.length > 0,
    saved: job.savedBy.length > 0,
    applicants: job._count.applications,
  };
}
