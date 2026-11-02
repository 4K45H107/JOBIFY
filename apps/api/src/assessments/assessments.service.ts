import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  type AssessmentInput,
  type Attempt,
  type CodingDraft,
  CodingLanguage,
  type CodingSubmission,
  type SubmitAttempt,
  type TeamAssessment,
} from "@jobify/shared";
import type { Prisma } from "@jobify/db";
import { getProblem } from "../coding/library";
import { CompanyAccessService } from "../companies/company-access.service";
import { PrismaService } from "../prisma/prisma.service";
import { deadlineOf, grade, isLate } from "./grading";

const withQuestions = {
  mcqQuestions: { orderBy: { position: "asc" } },
} satisfies Prisma.AssessmentInclude;
type AssessmentWithQuestions = Prisma.AssessmentGetPayload<{ include: typeof withQuestions }>;
type AttemptRow = Prisma.AttemptGetPayload<object>;

/** What a timed-out coding attempt stores in `answers`, so the team can tell. */
const TIMED_OUT = { timedOut: true };

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
      where: { jobId },
      include: withQuestions,
    });
    if (!assessment) throw new NotFoundException("This job has no skill test");
    return this.toTeam(assessment);
  }

  /**
   * Creates or replaces the job's test, of either kind (switching kind replaces it). Locked once
   * anyone has submitted.
   */
  async upsert(employerId: string, jobId: string, input: AssessmentInput): Promise<TeamAssessment> {
    await this.assertJobMember(employerId, jobId);
    if (input.kind === "CODING" && !getProblem(input.problemSlug))
      throw new BadRequestException("That problem isn't in the library");
    const existing = await this.prisma.assessment.findUnique({
      where: { jobId },
      include: { attempts: { where: { submittedAt: { not: null } }, select: { id: true } } },
    });
    if (existing && existing.attempts.length > 0) {
      throw new ConflictException("Candidates have already taken this test, so it can't change");
    }

    const fields = {
      kind: input.kind,
      title: input.title,
      timeLimitMin: input.timeLimitMin,
      problemSlug: input.kind === "CODING" ? input.problemSlug : null,
      mcqQuestions: {
        create:
          input.kind === "MCQ" ? input.questions.map((q, position) => ({ ...q, position })) : [],
      },
    };
    const assessment = await this.prisma.$transaction(async (tx) => {
      if (existing) {
        // Unsubmitted attempts belong to the old test; drop them so candidates start fresh.
        await tx.attempt.deleteMany({ where: { assessmentId: existing.id } });
        await tx.mcqQuestion.deleteMany({ where: { assessmentId: existing.id } });
        return tx.assessment.update({
          where: { id: existing.id },
          data: fields,
          include: withQuestions,
        });
      }
      return tx.assessment.create({ data: { jobId, ...fields }, include: withQuestions });
    });
    return this.toTeam(assessment);
  }

  async remove(employerId: string, jobId: string): Promise<void> {
    await this.assertJobMember(employerId, jobId);
    const existing = await this.prisma.assessment.findUnique({
      where: { jobId },
      include: { _count: { select: { attempts: true } } },
    });
    if (!existing) throw new NotFoundException("This job has no skill test");
    if (existing._count.attempts > 0)
      throw new ConflictException("Candidates have started this test, so it can't be removed");
    await this.prisma.assessment.delete({ where: { id: existing.id } });
  }

  /** A candidate's submitted code, for the hiring team. */
  async codingSubmission(employerId: string, applicationId: string): Promise<CodingSubmission> {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        job: { select: { companyId: true, assessments: true } },
        attempts: true,
        seeker: { include: { seekerProfile: { select: { fullName: true } } } },
      },
    });
    if (!application) throw new NotFoundException("Application not found");
    await this.access.assertMember(employerId, application.job.companyId);
    const assessment = application.job.assessments[0];
    const problem = assessment?.kind === "CODING" ? getProblem(assessment.problemSlug ?? "") : null;
    if (!assessment || !problem) throw new NotFoundException("This job has no coding test");

    // An attempt in progress isn't shared until it's submitted.
    const attempt = application.attempts.find(
      (a) => a.assessmentId === assessment.id && a.submittedAt,
    );
    const { slug, title, difficulty, topics, summary } = problem;
    return {
      applicationId,
      candidate: application.seeker.seekerProfile?.fullName ?? application.seeker.email,
      problem: { slug, title, difficulty, topics, summary },
      language: attempt?.language ? CodingLanguage.parse(attempt.language) : null,
      code: attempt?.code ?? null,
      submittedAt: attempt?.submittedAt?.toISOString() ?? null,
      timedOut: Boolean((attempt?.answers as { timedOut?: boolean } | null)?.timedOut),
    };
  }

  // ─── seeker ──────────────────────────────────────────────────────────────

  /** Starts the test for an application in TESTING, or returns the attempt already under way. */
  async start(seekerId: string, applicationId: string): Promise<Attempt> {
    const application = await this.prisma.application.findFirst({
      where: { id: applicationId, seekerId },
      include: { job: { include: { assessments: { include: withQuestions } } } },
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

  /** Autosaves code in progress (coding tests only). */
  async saveDraft(seekerId: string, attemptId: string, draft: CodingDraft): Promise<void> {
    const attempt = await this.loadOwnAttempt(seekerId, attemptId);
    if (attempt.assessment.kind !== "CODING")
      throw new BadRequestException("This test has no code to save");
    if (attempt.submittedAt) throw new ConflictException("You've already submitted this test");
    if (isLate(attempt.startedAt, attempt.assessment.timeLimitMin ?? 0)) {
      await this.expireIfLate(attempt, attempt.assessment);
      throw new ConflictException("Time ran out");
    }
    await this.prisma.attempt.updateMany({
      where: { id: attemptId, submittedAt: null },
      data: { language: draft.language, code: draft.code },
    });
  }

  async submit(seekerId: string, attemptId: string, input: SubmitAttempt): Promise<Attempt> {
    const attempt = await this.loadOwnAttempt(seekerId, attemptId);
    if (attempt.submittedAt) throw new ConflictException("You've already submitted this test");

    const timeLimit = attempt.assessment.timeLimitMin ?? 0;
    if (isLate(attempt.startedAt, timeLimit)) {
      await this.expireIfLate(attempt, attempt.assessment);
      throw new ConflictException("Time ran out before the answers were submitted");
    }

    let data: Prisma.AttemptUpdateManyMutationInput;
    if (attempt.assessment.kind === "CODING") {
      if (!("code" in input)) throw new BadRequestException("Submit your code");
      // Not graded yet: the hiring team reads the code. A code runner will score it later.
      data = { language: input.language, code: input.code, score: null, answers: {} };
    } else {
      if (!("answers" in input)) throw new BadRequestException("Submit your answers");
      const { score, byQuestion } = grade(attempt.assessment.mcqQuestions, input.answers);
      data = { score, answers: byQuestion };
    }
    // Compare-and-set so a double submit can't overwrite the first one.
    const updated = await this.prisma.attempt.updateMany({
      where: { id: attemptId, submittedAt: null },
      data: { ...data, submittedAt: new Date() },
    });
    if (updated.count === 0) throw new ConflictException("You've already submitted this test");
    const saved = await this.prisma.attempt.findUniqueOrThrow({ where: { id: attemptId } });
    return this.toAttempt(saved, attempt.assessment);
  }

  // ─── helpers ─────────────────────────────────────────────────────────────

  private async loadOwnAttempt(seekerId: string, attemptId: string) {
    const attempt = await this.prisma.attempt.findFirst({
      where: { id: attemptId, application: { seekerId } },
      include: { assessment: { include: withQuestions } },
    });
    if (!attempt) throw new NotFoundException("Test attempt not found");
    return attempt;
  }

  /**
   * An abandoned attempt past its time is closed. MCQ: nothing was submitted, so 0. Coding: the
   * last autosaved code is submitted for them.
   */
  private async expireIfLate(
    attempt: AttemptRow,
    assessment: { kind: string; timeLimitMin: number | null },
  ): Promise<AttemptRow> {
    if (attempt.submittedAt || !isLate(attempt.startedAt, assessment.timeLimitMin ?? 0))
      return attempt;
    await this.prisma.attempt.updateMany({
      where: { id: attempt.id, submittedAt: null },
      data: {
        submittedAt: deadlineOf(attempt.startedAt, assessment.timeLimitMin ?? 0),
        ...(assessment.kind === "CODING"
          ? { score: null, answers: TIMED_OUT }
          : { score: 0, answers: {} }),
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
    const submitted = attempts.filter((a) => a.submittedAt);
    const scores = submitted.filter((a) => a.score !== null).map((a) => a.score!);
    return {
      id: assessment.id,
      jobId: assessment.jobId,
      kind: assessment.kind,
      title: assessment.title,
      timeLimitMin: assessment.timeLimitMin ?? 0,
      questions: assessment.mcqQuestions.map(({ id, prompt, options, correctIndex }) => ({
        id,
        prompt,
        options,
        correctIndex,
      })),
      problem: assessment.kind === "CODING" ? getProblem(assessment.problemSlug ?? "") : null,
      locked: submitted.length > 0,
      stats: {
        started: attempts.length,
        submitted: submitted.length,
        averageScore: scores.length
          ? Math.round((scores.reduce((s, x) => s + x, 0) / scores.length) * 10) / 10
          : null,
      },
    };
  }

  /** The seeker's view: never includes correctIndex or hidden tests. */
  private toAttempt(attempt: AttemptRow, assessment: AssessmentWithQuestions): Attempt {
    const timeLimitMin = assessment.timeLimitMin ?? 0;
    const coding = assessment.kind === "CODING";
    const language = CodingLanguage.safeParse(attempt.language);
    return {
      id: attempt.id,
      applicationId: attempt.applicationId,
      kind: assessment.kind,
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
      answers:
        !coding && attempt.submittedAt
          ? ((attempt.answers ?? {}) as Record<string, number | null>)
          : null,
      problem: coding ? getProblem(assessment.problemSlug ?? "") : null,
      code:
        coding && language.success ? { language: language.data, code: attempt.code ?? "" } : null,
    };
  }
}
