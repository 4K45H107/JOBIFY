import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { AssessmentInput, Attempt, SubmitAttempt, TeamAssessment } from "@jobify/shared";
import type { Prisma } from "@jobify/db";
import { CompanyAccessService } from "../companies/company-access.service";
import { PrismaService } from "../prisma/prisma.service";
import { deadlineOf, grade, isLate } from "./grading";

const withQuestions = {
  mcqQuestions: { orderBy: { position: "asc" } },
} satisfies Prisma.AssessmentInclude;
type AssessmentWithQuestions = Prisma.AssessmentGetPayload<{ include: typeof withQuestions }>;
type AttemptRow = Prisma.AttemptGetPayload<object>;

@Injectable()
export class AssessmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: CompanyAccessService,
  ) {}

  // ─── hiring team ─────────────────────────────────────────────────────────

  async getForTeam(employerId: string, jobId: string): Promise<TeamAssessment> {
    await this.assertJobMember(employerId, jobId);
    const assessment = await this.prisma.assessment.findUnique({
      where: { jobId_kind: { jobId, kind: "MCQ" } },
      include: withQuestions,
    });
    if (!assessment) throw new NotFoundException("This job has no skill test");
    return this.toTeam(assessment);
  }

  /** Creates or replaces the job's test. Locked once anyone has submitted. */
  async upsert(employerId: string, jobId: string, input: AssessmentInput): Promise<TeamAssessment> {
    await this.assertJobMember(employerId, jobId);
    const existing = await this.prisma.assessment.findUnique({
      where: { jobId_kind: { jobId, kind: "MCQ" } },
      include: { attempts: { where: { submittedAt: { not: null } }, select: { id: true } } },
    });
    if (existing && existing.attempts.length > 0) {
      throw new ConflictException("Candidates have already taken this test, so it can't change");
    }

    const questions = input.questions.map((q, position) => ({ ...q, position }));
    const assessment = await this.prisma.$transaction(async (tx) => {
      if (existing) {
        // Unsubmitted attempts belong to the old questions; drop them so candidates start fresh.
        await tx.attempt.deleteMany({ where: { assessmentId: existing.id } });
        await tx.mcqQuestion.deleteMany({ where: { assessmentId: existing.id } });
        return tx.assessment.update({
          where: { id: existing.id },
          data: {
            title: input.title,
            timeLimitMin: input.timeLimitMin,
            mcqQuestions: { create: questions },
          },
          include: withQuestions,
        });
      }
      return tx.assessment.create({
        data: {
          jobId,
          kind: "MCQ",
          title: input.title,
          timeLimitMin: input.timeLimitMin,
          mcqQuestions: { create: questions },
        },
        include: withQuestions,
      });
    });
    return this.toTeam(assessment);
  }

  async remove(employerId: string, jobId: string): Promise<void> {
    await this.assertJobMember(employerId, jobId);
    const existing = await this.prisma.assessment.findUnique({
      where: { jobId_kind: { jobId, kind: "MCQ" } },
      include: { _count: { select: { attempts: true } } },
    });
    if (!existing) throw new NotFoundException("This job has no skill test");
    if (existing._count.attempts > 0)
      throw new ConflictException("Candidates have started this test, so it can't be removed");
    await this.prisma.assessment.delete({ where: { id: existing.id } });
  }

  // ─── seeker ──────────────────────────────────────────────────────────────

  /** Starts the test for an application in TESTING, or returns the attempt already under way. */
  async start(seekerId: string, applicationId: string): Promise<Attempt> {
    const application = await this.prisma.application.findFirst({
      where: { id: applicationId, seekerId },
      include: {
        job: { include: { assessments: { where: { kind: "MCQ" }, include: withQuestions } } },
      },
    });
    if (!application) throw new NotFoundException("Application not found");
    const assessment = application.job.assessments[0];
    if (!assessment) throw new NotFoundException("This job has no skill test");

    let attempt = await this.prisma.attempt.findUnique({
      where: { assessmentId_applicationId: { assessmentId: assessment.id, applicationId } },
    });
    if (!attempt) {
      if (application.stage !== "TESTING")
        throw new ForbiddenException("This test isn't open for your application");
      attempt = await this.prisma.attempt.upsert({
        where: { assessmentId_applicationId: { assessmentId: assessment.id, applicationId } },
        create: { assessmentId: assessment.id, applicationId },
        update: {},
      });
    }
    attempt = await this.expireIfLate(attempt, assessment);
    return this.toAttempt(attempt, assessment);
  }

  async submit(seekerId: string, attemptId: string, input: SubmitAttempt): Promise<Attempt> {
    const attempt = await this.prisma.attempt.findFirst({
      where: { id: attemptId, application: { seekerId } },
      include: { assessment: { include: withQuestions } },
    });
    if (!attempt) throw new NotFoundException("Test attempt not found");
    if (attempt.submittedAt) throw new ConflictException("You've already submitted this test");

    const timeLimit = attempt.assessment.timeLimitMin ?? 0;
    if (isLate(attempt.startedAt, timeLimit)) {
      await this.expireIfLate(attempt, attempt.assessment);
      throw new ConflictException("Time ran out before the answers were submitted");
    }

    const { score, byQuestion } = grade(attempt.assessment.mcqQuestions, input.answers);
    // Compare-and-set so a double submit can't overwrite the first grade.
    const updated = await this.prisma.attempt.updateMany({
      where: { id: attemptId, submittedAt: null },
      data: { submittedAt: new Date(), score, answers: byQuestion },
    });
    if (updated.count === 0) throw new ConflictException("You've already submitted this test");
    const saved = await this.prisma.attempt.findUniqueOrThrow({ where: { id: attemptId } });
    return this.toAttempt(saved, attempt.assessment);
  }

  // ─── helpers ─────────────────────────────────────────────────────────────

  /** An abandoned attempt past its time is closed with whatever was submitted: nothing, so 0. */
  private async expireIfLate(
    attempt: AttemptRow,
    assessment: { timeLimitMin: number | null },
  ): Promise<AttemptRow> {
    if (attempt.submittedAt || !isLate(attempt.startedAt, assessment.timeLimitMin ?? 0))
      return attempt;
    await this.prisma.attempt.updateMany({
      where: { id: attempt.id, submittedAt: null },
      data: {
        submittedAt: deadlineOf(attempt.startedAt, assessment.timeLimitMin ?? 0),
        score: 0,
        answers: {},
      },
    });
    return this.prisma.attempt.findUniqueOrThrow({ where: { id: attempt.id } });
  }

  private async assertJobMember(employerId: string, jobId: string): Promise<void> {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      select: { companyId: true },
    });
    if (!job) throw new NotFoundException("Job not found");
    await this.access.assertMember(employerId, job.companyId);
  }

  private async toTeam(assessment: AssessmentWithQuestions): Promise<TeamAssessment> {
    const attempts = await this.prisma.attempt.findMany({
      where: { assessmentId: assessment.id },
      select: { submittedAt: true, score: true },
    });
    const scores = attempts.filter((a) => a.submittedAt && a.score !== null).map((a) => a.score!);
    return {
      id: assessment.id,
      jobId: assessment.jobId,
      title: assessment.title,
      timeLimitMin: assessment.timeLimitMin ?? 0,
      questions: assessment.mcqQuestions.map(({ id, prompt, options, correctIndex }) => ({
        id,
        prompt,
        options,
        correctIndex,
      })),
      locked: scores.length > 0,
      stats: {
        started: attempts.length,
        submitted: scores.length,
        averageScore: scores.length
          ? Math.round((scores.reduce((s, x) => s + x, 0) / scores.length) * 10) / 10
          : null,
      },
    };
  }

  /** The seeker's view: never includes correctIndex. */
  private toAttempt(attempt: AttemptRow, assessment: AssessmentWithQuestions): Attempt {
    const timeLimitMin = assessment.timeLimitMin ?? 0;
    return {
      id: attempt.id,
      applicationId: attempt.applicationId,
      title: assessment.title,
      timeLimitMin,
      startedAt: attempt.startedAt.toISOString(),
      deadline: deadlineOf(attempt.startedAt, timeLimitMin).toISOString(),
      submittedAt: attempt.submittedAt?.toISOString() ?? null,
      score: attempt.score,
      questions: assessment.mcqQuestions.map(({ id, prompt, options }) => ({
        id,
        prompt,
        options,
      })),
      answers: attempt.submittedAt
        ? ((attempt.answers ?? {}) as Record<string, number | null>)
        : null,
    };
  }
}
