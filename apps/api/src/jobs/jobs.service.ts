import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  EmployerJobsQuery,
  JobCreate,
  JobDetail,
  JobList,
  JobSearchQuery,
  JobSummary,
  JobUpdate,
  PlatformStats,
  RecommendedJob,
  UserRole,
} from "@jobify/shared";
import type { Prisma } from "@jobify/db";
import { CompanyAccessService } from "../companies/company-access.service";
import { PrismaService } from "../prisma/prisma.service";
import { summaryInclude, toSummary } from "./job-summary";
import { ageOn, scoreJob } from "./recommend";

interface Viewer {
  id: string;
  role: UserRole;
}

/** Start of today in UTC: a job with today's deadline is still open. */
export const startOfTodayUtc = () => new Date(new Date().toISOString().slice(0, 10));

/** Jobs a seeker can see and apply to. */
export const openJobs = (): Prisma.JobWhereInput => ({
  status: "OPEN",
  OR: [{ deadline: null }, { deadline: { gte: startOfTodayUtc() } }],
});

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: CompanyAccessService,
  ) {}

  // ─── discovery ───────────────────────────────────────────────────────────

  async search(viewer: Viewer, query: JobSearchQuery): Promise<JobList> {
    const { q, type, workplace, location, company, companySlug, salary, sort, page, pageSize } =
      query;
    const where: Prisma.JobWhereInput = {
      AND: [
        openJobs(),
        q
          ? {
              OR: [
                { title: { contains: q, mode: "insensitive" } },
                { description: { contains: q, mode: "insensitive" } },
                { company: { name: { contains: q, mode: "insensitive" } } },
                { skills: { some: { skill: { name: { equals: q, mode: "insensitive" } } } } },
              ],
            }
          : {},
        type.length ? { type: { in: type } } : {},
        workplace.length ? { workplace: { in: workplace } } : {},
        location
          ? {
              OR: [
                { city: { contains: location, mode: "insensitive" } },
                { country: { contains: location, mode: "insensitive" } },
              ],
            }
          : {},
        company ? { company: { name: { contains: company, mode: "insensitive" } } } : {},
        companySlug ? { company: { slug: companySlug } } : {},
        salary !== undefined ? { salaryMax: { gte: salary } } : {},
      ],
    };

    const orderBy: Prisma.JobOrderByWithRelationInput[] =
      sort === "trending"
        ? [
            { applications: { _count: "desc" } },
            { savedBy: { _count: "desc" } },
            { createdAt: "desc" },
          ]
        : sort === "salary"
          ? [{ salaryMax: "desc" }, { createdAt: "desc" }]
          : [{ createdAt: "desc" }];

    const [total, jobs] = await this.prisma.$transaction([
      this.prisma.job.count({ where }),
      this.prisma.job.findMany({
        where,
        include: summaryInclude(viewer.id),
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return { items: jobs.map(toSummary), total, page, pageSize };
  }

  /** Scores recent open jobs against the seeker's preferences and skills. */
  async forYou(seekerId: string, limit = 20): Promise<RecommendedJob[]> {
    const seeker = await this.prisma.user.findUniqueOrThrow({
      where: { id: seekerId },
      include: { jobPreference: true, skills: { include: { skill: true } }, seekerProfile: true },
    });
    const signals = {
      titles: seeker.jobPreference?.titles ?? [],
      locations: seeker.jobPreference?.locations ?? [],
      jobTypes: seeker.jobPreference?.jobTypes ?? [],
      workplace: seeker.jobPreference?.workplace ?? [],
      minSalary: seeker.jobPreference?.minSalary ?? null,
      skills: seeker.skills.map((s) => s.skill.name),
      age: ageOn(seeker.seekerProfile?.birthdate ?? null),
    };

    const candidates = await this.prisma.job.findMany({
      where: { ...openJobs(), applications: { none: { seekerId } } },
      include: summaryInclude(seekerId),
      orderBy: { createdAt: "desc" },
      take: 300,
    });

    return candidates
      .map((job) => ({
        job,
        ...scoreJob(signals, { ...job, skills: job.skills.map((s) => s.skill.name) }),
      }))
      .filter((r) => r.eligible && r.score > 0)
      .sort((a, b) => b.score - a.score || b.job.createdAt.getTime() - a.job.createdAt.getTime())
      .slice(0, limit)
      .map((r) => ({ ...toSummary(r.job), score: r.score, reasons: r.reasons }));
  }

  async detail(viewer: Viewer, jobId: string): Promise<JobDetail> {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: {
        ...summaryInclude(viewer.id),
        screeningQuestions: { orderBy: { position: "asc" } },
        postedBy: { include: { employerProfile: { select: { fullName: true } } } },
        applications: { where: { seekerId: viewer.id }, select: { id: true } },
      },
    });
    if (!job) throw new NotFoundException("Job not found");

    const canManage =
      viewer.role === "EMPLOYER" && (await this.access.isMember(viewer.id, job.companyId));
    const visible = canManage || viewer.role === "ADMIN" || job.status !== "DRAFT";
    if (!visible) throw new NotFoundException("Job not found");

    if (viewer.role === "SEEKER") {
      await this.prisma.jobView.upsert({
        where: { userId_jobId: { userId: viewer.id, jobId } },
        create: { userId: viewer.id, jobId },
        update: { viewedAt: new Date() },
      });
    }

    return {
      ...toSummary(job),
      description: job.description,
      ageMin: job.ageMin,
      ageMax: job.ageMax,
      screeningQuestions: job.screeningQuestions.map(({ id, prompt, kind, required }) => ({
        id,
        prompt,
        kind,
        required,
      })),
      postedBy: {
        id: job.postedById,
        fullName: job.postedBy.employerProfile?.fullName ?? "Recruiter",
      },
      canManage,
      applied: job.applications.length > 0,
    };
  }

  /** Other open jobs sharing skills or title words, best overlap first. */
  async similar(viewer: Viewer, jobId: string, limit = 4): Promise<JobSummary[]> {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: { skills: true },
    });
    if (!job) throw new NotFoundException("Job not found");
    const titleWords = job.title.split(/\s+/).filter((w) => w.length > 2);
    const candidates = await this.prisma.job.findMany({
      where: {
        AND: [
          openJobs(),
          { id: { not: jobId } },
          {
            OR: [
              { skills: { some: { skillId: { in: job.skills.map((s) => s.skillId) } } } },
              ...titleWords.map((w) => ({ title: { contains: w, mode: "insensitive" as const } })),
            ],
          },
        ],
      },
      include: summaryInclude(viewer.id),
      orderBy: { createdAt: "desc" },
      take: 40,
    });
    const mine = new Set(job.skills.map((s) => s.skillId));
    return candidates
      .map((c) => ({
        c,
        overlap:
          c.skills.filter((s) => mine.has(s.skillId)).length + (c.title === job.title ? 2 : 0),
      }))
      .sort((a, b) => b.overlap - a.overlap)
      .slice(0, limit)
      .map(({ c }) => toSummary(c));
  }

  async stats(): Promise<PlatformStats> {
    const [open, companies, seekers] = await this.prisma.$transaction([
      this.prisma.job.count({ where: openJobs() }),
      this.prisma.company.count(),
      this.prisma.user.count({ where: { role: "SEEKER" } }),
    ]);
    return { openJobs: open, companies, seekers };
  }

  // ─── seeker activity ─────────────────────────────────────────────────────

  async save(userId: string, jobId: string): Promise<void> {
    const job = await this.prisma.job.findFirst({ where: { id: jobId, status: { not: "DRAFT" } } });
    if (!job) throw new NotFoundException("Job not found");
    await this.prisma.savedJob.upsert({
      where: { userId_jobId: { userId, jobId } },
      create: { userId, jobId },
      update: {},
    });
  }

  async unsave(userId: string, jobId: string): Promise<void> {
    await this.prisma.savedJob.deleteMany({ where: { userId, jobId } });
  }

  async saved(userId: string): Promise<JobSummary[]> {
    const saved = await this.prisma.savedJob.findMany({
      where: { userId },
      include: { job: { include: summaryInclude(userId) } },
      orderBy: { createdAt: "desc" },
    });
    return saved.map((s) => toSummary(s.job));
  }

  async recent(userId: string, limit = 10): Promise<JobSummary[]> {
    const views = await this.prisma.jobView.findMany({
      where: { userId, job: { status: { not: "DRAFT" } } },
      include: { job: { include: summaryInclude(userId) } },
      orderBy: { viewedAt: "desc" },
      take: limit,
    });
    return views.map((v) => toSummary(v.job));
  }

  // ─── employer ────────────────────────────────────────────────────────────

  async create(employerId: string, input: JobCreate): Promise<JobDetail> {
    const { companyId } = await this.access.activeMembership(employerId);
    const { skills, screeningQuestions, deadline, ...fields } = input;
    const skillIds = await this.skillIds(skills);
    const job = await this.prisma.job.create({
      data: {
        ...fields,
        deadline: deadline ? new Date(deadline) : null,
        companyId,
        postedById: employerId,
        skills: { create: skillIds.map((skillId) => ({ skillId })) },
        screeningQuestions: {
          create: screeningQuestions.map((q, position) => ({ ...q, position })),
        },
      },
    });
    return this.detail({ id: employerId, role: "EMPLOYER" }, job.id);
  }

  async update(employerId: string, jobId: string, input: JobUpdate): Promise<JobDetail> {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: { _count: { select: { applications: true } } },
    });
    if (!job) throw new NotFoundException("Job not found");
    await this.access.assertMember(employerId, job.companyId);

    const { skills, screeningQuestions, deadline, ...fields } = input;
    const salaryMin = fields.salaryMin ?? job.salaryMin;
    const salaryMax = fields.salaryMax ?? job.salaryMax;
    if (salaryMax < salaryMin)
      throw new BadRequestException("Maximum salary must be at least the minimum");
    if (screeningQuestions && job._count.applications > 0) {
      throw new ConflictException("Screening questions can't change once people have applied");
    }
    if (fields.status === "DRAFT" && job.status !== "DRAFT") {
      throw new ConflictException("A published job can be closed, not moved back to draft");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.job.update({
        where: { id: jobId },
        data: {
          ...fields,
          ...(deadline !== undefined && { deadline: deadline ? new Date(deadline) : null }),
        },
      });
      if (skills) {
        const skillIds = await this.skillIds(skills, tx);
        await tx.jobSkill.deleteMany({ where: { jobId } });
        await tx.jobSkill.createMany({ data: skillIds.map((skillId) => ({ jobId, skillId })) });
      }
      if (screeningQuestions) {
        await tx.screeningQuestion.deleteMany({ where: { jobId } });
        await tx.screeningQuestion.createMany({
          data: screeningQuestions.map((q, position) => ({ ...q, jobId, position })),
        });
      }
    });
    return this.detail({ id: employerId, role: "EMPLOYER" }, jobId);
  }

  /** "My Offerings" (posted by me) or "My Company Jobs" (whole company). */
  async employerJobs(
    employerId: string,
    { scope, status, page, pageSize }: EmployerJobsQuery,
  ): Promise<JobList> {
    const { companyId } = await this.access.activeMembership(employerId);
    const where: Prisma.JobWhereInput = {
      companyId,
      ...(scope === "mine" && { postedById: employerId }),
      ...(status && { status }),
    };
    const [total, jobs] = await this.prisma.$transaction([
      this.prisma.job.count({ where }),
      this.prisma.job.findMany({
        where,
        include: summaryInclude(employerId),
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return { items: jobs.map(toSummary), total, page, pageSize };
  }

  /** Skill ids for names, creating unknown skills (matched case-insensitively). */
  private async skillIds(
    names: string[],
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<string[]> {
    const ids: string[] = [];
    const seen = new Set<string>();
    for (const name of names) {
      if (seen.has(name.toLowerCase())) continue;
      seen.add(name.toLowerCase());
      const existing = await tx.skill.findFirst({
        where: { name: { equals: name, mode: "insensitive" } },
      });
      ids.push((existing ?? (await tx.skill.create({ data: { name } }))).id);
    }
    return ids;
  }
}
