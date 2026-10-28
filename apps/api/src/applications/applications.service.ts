import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import {
  type Applicant,
  type ApplicantsQuery,
  type ApplicationStage,
  type ApplyInput,
  canMoveTo,
  type MyApplication,
  type MyApplications,
  type StageChange,
  WITHDRAWABLE,
} from "@jobify/shared";
import { isUniqueConstraintError, type Prisma } from "@jobify/db";
import { CompanyAccessService } from "../companies/company-access.service";
import { fileUrl, userFileKey } from "../files/file-keys";
import { summaryInclude, toSummary } from "../jobs/job-summary";
import { openJobs } from "../jobs/jobs.service";
import { ageOn } from "../jobs/recommend";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import { checkScreeningAnswers } from "./screening";

const historyInclude = {
  stageChanges: { orderBy: { createdAt: "asc" } },
} satisfies Prisma.ApplicationInclude;

type AttemptLite = { submittedAt: Date | null; score: number | null };

function testStatus(
  hasAssessment: boolean,
  attempt: AttemptLite | undefined,
): MyApplication["test"] {
  if (!hasAssessment) return { state: null, score: null };
  if (!attempt) return { state: "NOT_STARTED", score: null };
  return attempt.submittedAt
    ? { state: "SUBMITTED", score: attempt.score }
    : { state: "IN_PROGRESS", score: null };
}

const toHistory = (
  changes: {
    fromStage: ApplicationStage | null;
    toStage: ApplicationStage;
    createdAt: Date;
    note: string | null;
  }[],
) =>
  changes.map((c) => ({
    from: c.fromStage,
    to: c.toStage,
    at: c.createdAt.toISOString(),
    note: c.note,
  }));

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly access: CompanyAccessService,
    private readonly notifications: NotificationsService,
  ) {}

  // ─── seeker ──────────────────────────────────────────────────────────────

  async apply(seekerId: string, jobId: string, input: ApplyInput): Promise<MyApplication> {
    const job = await this.prisma.job.findFirst({
      where: { AND: [{ id: jobId }, openJobs()] },
      include: {
        screeningQuestions: true,
        assessments: { where: { kind: "MCQ" }, select: { id: true } },
      },
    });
    if (!job) throw new NotFoundException("This job isn't accepting applications");

    const profile = await this.prisma.seekerProfile.findUniqueOrThrow({
      where: { userId: seekerId },
    });
    if (!profile.cvKey) throw new UnprocessableEntityException("Upload your CV before applying");

    const age = ageOn(profile.birthdate);
    if (
      age !== null &&
      ((job.ageMin !== null && age < job.ageMin) || (job.ageMax !== null && age > job.ageMax))
    ) {
      throw new ForbiddenException("This job has an age requirement you don't meet");
    }

    const { errors, normalised } = checkScreeningAnswers(job.screeningQuestions, input.answers);
    if (Object.keys(errors).length > 0) {
      throw new BadRequestException({
        message: "Some screening answers need attention",
        details: errors,
      });
    }

    const existing = await this.prisma.application.findUnique({
      where: { jobId_seekerId: { jobId, seekerId } },
    });
    if (existing) throw new ConflictException("You've already applied to this job");

    // Snapshot the CV: replacing it on the profile later must not change (or delete) this application's copy.
    const cvKey = userFileKey(seekerId, "cv", "pdf");
    await this.storage.copy(profile.cvKey, cvKey);

    const stage: ApplicationStage = job.assessments.length > 0 ? "TESTING" : "APPLIED";
    let applicationId: string;
    try {
      const application = await this.prisma.application.create({
        data: {
          jobId,
          seekerId,
          cvKey,
          contact: input.contact,
          stage,
          answers: { create: normalised },
          stageChanges: { create: [{ fromStage: null, toStage: stage, changedById: seekerId }] },
        },
      });
      applicationId = application.id;
    } catch (error) {
      await this.storage.delete(cvKey);
      if (isUniqueConstraintError(error))
        throw new ConflictException("You've already applied to this job");
      throw error;
    }

    const company = await this.prisma.company.findUniqueOrThrow({ where: { id: job.companyId } });
    await this.notifications.notify([job.postedById], "APPLICATION_SUBMITTED", {
      applicationId,
      jobId,
      jobTitle: job.title,
      applicant: input.contact.fullName,
    });
    if (stage === "TESTING") {
      await this.notifications.notify([seekerId], "ASSESSMENT_ASSIGNED", {
        applicationId,
        jobId,
        jobTitle: job.title,
        company: company.name,
      });
    }
    return this.mine(seekerId, applicationId);
  }

  async listMine(seekerId: string): Promise<MyApplications> {
    const applications = await this.prisma.application.findMany({
      where: { seekerId },
      include: {
        job: { include: summaryInclude(seekerId) },
        attempts: { select: { submittedAt: true, score: true } },
        ...historyInclude,
      },
      orderBy: { updatedAt: "desc" },
    });
    const items = applications.map((a) => this.toMine(a));
    const counts = Object.fromEntries(
      (
        [
          "APPLIED",
          "TESTING",
          "SHORTLISTED",
          "INTERVIEW",
          "OFFER",
          "REJECTED",
          "WITHDRAWN",
        ] as const
      ).map((s) => [s, items.filter((i) => i.stage === s).length]),
    ) as MyApplications["counts"];
    return { items, counts };
  }

  async mine(seekerId: string, applicationId: string): Promise<MyApplication> {
    const application = await this.prisma.application.findFirst({
      where: { id: applicationId, seekerId },
      include: {
        job: { include: summaryInclude(seekerId) },
        attempts: { select: { submittedAt: true, score: true } },
        ...historyInclude,
      },
    });
    if (!application) throw new NotFoundException("Application not found");
    return this.toMine(application);
  }

  async withdraw(seekerId: string, applicationId: string): Promise<MyApplication> {
    const application = await this.prisma.application.findFirst({
      where: { id: applicationId, seekerId },
    });
    if (!application) throw new NotFoundException("Application not found");
    if (!WITHDRAWABLE.includes(application.stage)) {
      throw new ConflictException("This application can no longer be withdrawn");
    }
    await this.moveStage(application.id, application.stage, "WITHDRAWN", seekerId, null);
    return this.mine(seekerId, applicationId);
  }

  // ─── hiring team ─────────────────────────────────────────────────────────

  async applicants(
    employerId: string,
    jobId: string,
    { stage, sort }: ApplicantsQuery,
  ): Promise<Applicant[]> {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: { assessments: { select: { id: true } }, screeningQuestions: true },
    });
    if (!job) throw new NotFoundException("Job not found");
    await this.access.assertMember(employerId, job.companyId);

    const applications = await this.prisma.application.findMany({
      where: { jobId, ...(stage && { stage }) },
      include: {
        seeker: {
          include: { seekerProfile: true, skills: { include: { skill: true } } },
        },
        answers: true,
        attempts: { select: { submittedAt: true, score: true } },
        ...historyInclude,
      },
      orderBy: { createdAt: "desc" },
    });

    const prompts = new Map(job.screeningQuestions.map((q) => [q.id, q.prompt]));
    const applicants: Applicant[] = applications.map((a) => {
      const p = a.seeker.seekerProfile;
      return {
        id: a.id,
        stage: a.stage,
        appliedAt: a.createdAt.toISOString(),
        contact: a.contact as Applicant["contact"],
        cvUrl: fileUrl(a.cvKey)!,
        seeker: {
          id: a.seekerId,
          fullName: p?.fullName ?? a.seeker.email,
          photoUrl: fileUrl(p?.photoKey),
          headline: p?.headline ?? null,
          currentPosition: p?.currentPosition ?? null,
          employmentStatus: p?.employmentStatus ?? null,
          experienceYears: p?.experienceYears ?? null,
          location: p?.location ?? null,
          skills: a.seeker.skills.map((s) => s.skill.name).sort(),
        },
        answers: a.answers.map((ans) => ({
          questionId: ans.questionId,
          prompt: prompts.get(ans.questionId) ?? "",
          answer: ans.answer,
        })),
        test: testStatus(job.assessments.length > 0, a.attempts[0]),
        history: toHistory(a.stageChanges),
      };
    });

    // Figma "Sort By": test marks, experience or application date (nulls last).
    const key = (a: Applicant) =>
      sort === "score"
        ? a.test.score
        : sort === "experience"
          ? a.seeker.experienceYears
          : Date.parse(a.appliedAt);
    return applicants.sort((a, b) => (key(b) ?? -Infinity) - (key(a) ?? -Infinity));
  }

  async changeStage(
    employerId: string,
    applicationId: string,
    { stage, note }: StageChange,
  ): Promise<Applicant> {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: { job: true },
    });
    if (!application) throw new NotFoundException("Application not found");
    await this.access.assertMember(employerId, application.job.companyId);

    if (!canMoveTo(application.stage, stage)) {
      throw new ConflictException(
        `Can't move an application from ${application.stage} to ${stage}`,
      );
    }
    await this.moveStage(application.id, application.stage, stage, employerId, note ?? null);

    const company = await this.prisma.company.findUniqueOrThrow({
      where: { id: application.job.companyId },
    });
    await this.notifications.notify([application.seekerId], "APPLICATION_STAGE_CHANGED", {
      applicationId,
      jobId: application.jobId,
      jobTitle: application.job.title,
      company: company.name,
      stage,
    });

    const [updated] = (
      await this.applicants(employerId, application.jobId, { sort: "date" })
    ).filter((a) => a.id === applicationId);
    return updated!;
  }

  // ─── helpers ─────────────────────────────────────────────────────────────

  /** Optimistic transition: fails if someone else moved the application first. */
  private async moveStage(
    applicationId: string,
    from: ApplicationStage,
    to: ApplicationStage,
    changedById: string,
    note: string | null,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const moved = await tx.application.updateMany({
        where: { id: applicationId, stage: from },
        data: { stage: to },
      });
      if (moved.count === 0)
        throw new ConflictException("The application changed meanwhile. Reload and try again.");
      await tx.applicationStageChange.create({
        data: { applicationId, fromStage: from, toStage: to, changedById, note },
      });
    });
  }

  private toMine(
    a: Prisma.ApplicationGetPayload<{
      include: {
        job: { include: ReturnType<typeof summaryInclude> };
        attempts: { select: { submittedAt: true; score: true } };
      } & typeof historyInclude;
    }>,
  ): MyApplication {
    const job = toSummary(a.job);
    return {
      id: a.id,
      stage: a.stage,
      appliedAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
      job,
      test: testStatus(job.hasAssessment, a.attempts[0]),
      history: toHistory(a.stageChanges),
    };
  }
}
