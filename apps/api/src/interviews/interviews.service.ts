import { randomUUID } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  type Interview,
  type InterviewListQuery,
  type InterviewSchedule,
  type InterviewUpdate,
  isJoinable,
  JOIN_LATE_MIN,
  type JoinToken,
  type UserRole,
} from "@jobify/shared";
import type { Prisma } from "@jobify/db";
import { AccessToken } from "livekit-server-sdk";
import { ApplicationsService } from "../applications/applications.service";
import { CompanyAccessService } from "../companies/company-access.service";
import type { Env } from "../config/env";
import { fileUrl } from "../files/file-keys";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";

const include = {
  application: {
    include: {
      job: { include: { company: true } },
      seeker: { include: { seekerProfile: true } },
    },
  },
  createdBy: { include: { employerProfile: true } },
} satisfies Prisma.InterviewInclude;
type Row = Prisma.InterviewGetPayload<{ include: typeof include }>;

interface Viewer {
  id: string;
  role: UserRole;
}

const endOf = (start: Date, minutes: number) => new Date(start.getTime() + minutes * 60_000);

@Injectable()
export class InterviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: CompanyAccessService,
    private readonly applications: ApplicationsService,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async schedule(
    employerId: string,
    applicationId: string,
    input: InterviewSchedule,
  ): Promise<Interview> {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: { job: true },
    });
    if (!application) throw new NotFoundException("Application not found");
    await this.access.assertMember(employerId, application.job.companyId);

    const start = new Date(input.scheduledAt);
    if (start.getTime() < Date.now() - 60_000)
      throw new BadRequestException("Pick a time in the future");
    await this.assertNoClash(start, input.durationMin, [application.seekerId, employerId]);
    await this.applications.advanceToInterview(applicationId, employerId);

    const interview = await this.prisma.interview.create({
      data: {
        applicationId,
        createdById: employerId,
        stage: input.stage,
        scheduledAt: start,
        durationMin: input.durationMin,
        roomName: `interview-${randomUUID()}`,
      },
      include,
    });
    await this.notifyParties(interview, "INTERVIEW_SCHEDULED");
    return this.toInterview(interview, { id: employerId, role: "EMPLOYER" });
  }

  async list(viewer: Viewer, { scope, jobId }: InterviewListQuery): Promise<Interview[]> {
    const now = new Date();
    // "Upcoming" includes anything still joinable; finished ones count as past.
    const cutoff = new Date(now.getTime() - JOIN_LATE_MIN * 60_000);
    const party: Prisma.InterviewWhereInput =
      viewer.role === "SEEKER"
        ? { application: { seekerId: viewer.id } }
        : {
            application: {
              job: { company: { members: { some: { userId: viewer.id, status: "ACTIVE" } } } },
            },
          };
    const timing: Prisma.InterviewWhereInput =
      scope === "upcoming"
        ? {
            status: { in: ["SCHEDULED", "LIVE"] },
            scheduledAt: { gte: new Date(cutoff.getTime() - 240 * 60_000) },
          }
        : { OR: [{ status: { in: ["COMPLETED", "CANCELLED"] } }, { scheduledAt: { lt: cutoff } }] };
    const where: Prisma.InterviewWhereInput = {
      AND: [party, jobId ? { application: { jobId } } : {}, timing],
    };

    const rows = await this.prisma.interview.findMany({
      where,
      include,
      orderBy: { scheduledAt: scope === "upcoming" ? "asc" : "desc" },
      take: 100,
    });
    return rows
      .filter((r) => scope === "past" || endOf(r.scheduledAt, r.durationMin + JOIN_LATE_MIN) >= now)
      .map((r) => this.toInterview(r, viewer));
  }

  async get(viewer: Viewer, id: string): Promise<Interview> {
    return this.toInterview(await this.loadForParty(viewer, id), viewer);
  }

  async update(employerId: string, id: string, input: InterviewUpdate): Promise<Interview> {
    const interview = await this.loadForParty({ id: employerId, role: "EMPLOYER" }, id);
    if (interview.status === "CANCELLED" || interview.status === "COMPLETED") {
      throw new ConflictException("This interview is already over");
    }

    const { status, scheduledAt, durationMin, stage } = input;
    const rescheduled = scheduledAt !== undefined || durationMin !== undefined;
    if (rescheduled) {
      const start = new Date(scheduledAt ?? interview.scheduledAt);
      if (start.getTime() < Date.now() - 60_000)
        throw new BadRequestException("Pick a time in the future");
      await this.assertNoClash(
        start,
        durationMin ?? interview.durationMin,
        [interview.application.seekerId, interview.createdById],
        id,
      );
    }

    const updated = await this.prisma.interview.update({
      where: { id },
      data: {
        ...(stage && { stage }),
        ...(scheduledAt && { scheduledAt: new Date(scheduledAt), reminderSentAt: null }),
        ...(durationMin && { durationMin }),
        ...(status && { status }),
      },
      include,
    });
    if (status === "CANCELLED")
      await this.notifyParties(updated, "INTERVIEW_SCHEDULED", { cancelled: true });
    else if (rescheduled)
      await this.notifyParties(updated, "INTERVIEW_SCHEDULED", { rescheduled: true });
    return this.toInterview(updated, { id: employerId, role: "EMPLOYER" });
  }

  /** A LiveKit access token for this room, only for its two parties and only while it's open. */
  async join(viewer: Viewer, id: string): Promise<JoinToken> {
    const interview = await this.loadForParty(viewer, id);
    if (!isJoinable(interview.scheduledAt, interview.durationMin, interview.status)) {
      throw new ForbiddenException("The interview room isn't open right now");
    }
    if (interview.status === "SCHEDULED") {
      await this.prisma.interview.update({ where: { id }, data: { status: "LIVE" } });
    }

    const name =
      viewer.role === "SEEKER"
        ? (interview.application.seeker.seekerProfile?.fullName ?? "Candidate")
        : ((await this.prisma.employerProfile.findUnique({ where: { userId: viewer.id } }))
            ?.fullName ?? "Interviewer");
    const token = new AccessToken(
      this.config.get("LIVEKIT_API_KEY", { infer: true }),
      this.config.get("LIVEKIT_API_SECRET", { infer: true }),
      {
        identity: viewer.id,
        name,
        ttl:
          Math.ceil(
            (endOf(interview.scheduledAt, interview.durationMin + JOIN_LATE_MIN).getTime() -
              Date.now()) /
              1000,
          ) + 600,
      },
    );
    token.addGrant({
      room: interview.roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });
    return {
      url: this.config.get("LIVEKIT_URL", { infer: true }),
      token: await token.toJwt(),
      roomName: interview.roomName,
      identity: viewer.id,
    };
  }

  // ─── helpers ─────────────────────────────────────────────────────────────

  /** The seeker of the application, or an active member of the hiring company; otherwise 404. */
  private async loadForParty(viewer: Viewer, id: string): Promise<Row> {
    const interview = await this.prisma.interview.findUnique({ where: { id }, include });
    if (!interview) throw new NotFoundException("Interview not found");
    const allowed =
      viewer.role === "SEEKER"
        ? interview.application.seekerId === viewer.id
        : viewer.role === "EMPLOYER" &&
          (await this.access.isMember(viewer.id, interview.application.job.companyId));
    if (!allowed) throw new NotFoundException("Interview not found");
    return interview;
  }

  /** Nobody can be in two interviews at once. */
  private async assertNoClash(
    start: Date,
    durationMin: number,
    userIds: string[],
    ignoreId?: string,
  ): Promise<void> {
    const end = endOf(start, durationMin);
    const candidates = await this.prisma.interview.findMany({
      where: {
        id: ignoreId ? { not: ignoreId } : undefined,
        status: { in: ["SCHEDULED", "LIVE"] },
        scheduledAt: { lt: end, gte: new Date(start.getTime() - 240 * 60_000) },
        OR: [{ createdById: { in: userIds } }, { application: { seekerId: { in: userIds } } }],
      },
    });
    const clash = candidates.find((c) => endOf(c.scheduledAt, c.durationMin) > start);
    if (clash) throw new ConflictException("That time overlaps another interview");
  }

  private async notifyParties(
    interview: Row,
    type: "INTERVIEW_SCHEDULED",
    extra: Prisma.InputJsonObject = {},
  ) {
    await this.notifications.notify([interview.application.seekerId], type, {
      interviewId: interview.id,
      jobTitle: interview.application.job.title,
      company: interview.application.job.company.name,
      scheduledAt: interview.scheduledAt.toISOString(),
      ...extra,
    });
  }

  private toInterview(r: Row, viewer: Viewer): Interview {
    const profile = r.application.seeker.seekerProfile;
    return {
      id: r.id,
      applicationId: r.applicationId,
      stage: r.stage,
      scheduledAt: r.scheduledAt.toISOString(),
      endsAt: endOf(r.scheduledAt, r.durationMin).toISOString(),
      durationMin: r.durationMin,
      status: r.status,
      job: { id: r.application.jobId, title: r.application.job.title },
      company: {
        name: r.application.job.company.name,
        slug: r.application.job.company.slug,
        logoUrl: fileUrl(r.application.job.company.logoKey),
      },
      seeker: {
        id: r.application.seekerId,
        fullName: profile?.fullName ?? "Candidate",
        photoUrl: fileUrl(profile?.photoKey),
      },
      interviewer: {
        id: r.createdById,
        fullName: r.createdBy.employerProfile?.fullName ?? "Interviewer",
      },
      canJoin: viewer.role !== "ADMIN" && isJoinable(r.scheduledAt, r.durationMin, r.status),
    };
  }
}
