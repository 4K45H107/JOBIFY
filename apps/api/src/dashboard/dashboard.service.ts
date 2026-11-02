import { Injectable } from "@nestjs/common";
import { Prisma } from "@jobify/db";
import {
  type ApplicationStage,
  DASHBOARD_RANGE_DAYS,
  type Dashboard,
  type DashboardQuery,
  type DashboardStat,
  fillDays,
  lastDays,
  rangeStart,
} from "@jobify/shared";
import { CompanyAccessService } from "../companies/company-access.service";
import { PrismaService } from "../prisma/prisma.service";

/** Still in the running: not yet hired, rejected or withdrawn. */
const ONGOING: ApplicationStage[] = ["APPLIED", "TESTING", "SHORTLISTED", "INTERVIEW"];

type DayRow = { day: string; count: number };

/**
 * Read-only numbers for the profile dashboard: headline counts and a per-day chart.
 * Everything is counted in the database; days are the viewer's calendar days.
 */
@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: CompanyAccessService,
  ) {}

  async seeker(seekerId: string, query: DashboardQuery, now = new Date()): Promise<Dashboard> {
    const mine: Prisma.ApplicationWhereInput = { seekerId };
    const [byStage, interviewed, upcoming] = await Promise.all([
      this.prisma.application.groupBy({ by: ["stage"], where: mine, _count: { _all: true } }),
      this.prisma.application.count({ where: { ...mine, ...reachedInterview } }),
      this.prisma.interview.count({
        where: { application: mine, status: "SCHEDULED", scheduledAt: { gte: now } },
      }),
    ]);
    const stages = stageCounts(byStage);

    const { days, since } = this.window(query, now);
    const [applied, viewed] = await Promise.all([
      this.perDay(Prisma.sql`
        SELECT ${localDay(Prisma.sql`"createdAt"`, query.tz)} AS day, count(*)::int AS count
        FROM "Application"
        WHERE "seekerId" = ${seekerId} AND "createdAt" >= ${since}
        GROUP BY day`),
      // A job counts once, on the day it was last viewed.
      this.perDay(Prisma.sql`
        SELECT ${localDay(Prisma.sql`"viewedAt"`, query.tz)} AS day, count(*)::int AS count
        FROM "JobView"
        WHERE "userId" = ${seekerId} AND "viewedAt" >= ${since}
        GROUP BY day`),
    ]);

    return {
      range: query.range,
      stats: [
        stat("applications", "Total applications", stages.total),
        stat("interviewed", "Selected for interviews", interviewed),
        stat("ongoing", "Ongoing", stages.ongoing),
        stat("offers", "Offers", stages.OFFER),
        stat("rejected", "Rejected", stages.REJECTED),
        stat("upcoming", "Upcoming interviews", upcoming),
      ],
      series: [
        { key: "applications", label: "Applications", points: fillDays(applied, days) },
        { key: "views", label: "Jobs viewed", points: fillDays(viewed, days) },
      ],
    };
  }

  /** The employer's whole company: every teammate's jobs and applicants. */
  async employer(employerId: string, query: DashboardQuery, now = new Date()): Promise<Dashboard> {
    const { companyId } = await this.access.activeMembership(employerId);
    const ours: Prisma.ApplicationWhereInput = { job: { companyId } };
    const [openJobs, byStage, interviewed, upcoming] = await Promise.all([
      this.prisma.job.count({ where: { companyId, status: "OPEN" } }),
      this.prisma.application.groupBy({ by: ["stage"], where: ours, _count: { _all: true } }),
      this.prisma.application.count({ where: { ...ours, ...reachedInterview } }),
      this.prisma.interview.count({
        where: { application: ours, status: "SCHEDULED", scheduledAt: { gte: now } },
      }),
    ]);
    const stages = stageCounts(byStage);

    const { days, since } = this.window(query, now);
    const [applicants, interviews] = await Promise.all([
      this.perDay(Prisma.sql`
        SELECT ${localDay(Prisma.sql`a."createdAt"`, query.tz)} AS day, count(*)::int AS count
        FROM "Application" a JOIN "Job" j ON j.id = a."jobId"
        WHERE j."companyId" = ${companyId} AND a."createdAt" >= ${since}
        GROUP BY day`),
      this.perDay(Prisma.sql`
        SELECT ${localDay(Prisma.sql`i."scheduledAt"`, query.tz)} AS day, count(*)::int AS count
        FROM "Interview" i
        JOIN "Application" a ON a.id = i."applicationId"
        JOIN "Job" j ON j.id = a."jobId"
        WHERE j."companyId" = ${companyId} AND i.status <> 'CANCELLED'
          AND i."scheduledAt" >= ${since} AND i."scheduledAt" <= ${now}
        GROUP BY day`),
    ]);

    return {
      range: query.range,
      stats: [
        stat("openJobs", "Open jobs", openJobs),
        stat("applicants", "Total applicants", stages.total),
        stat("ongoing", "In progress", stages.ongoing),
        stat("interviewed", "Selected for interviews", interviewed),
        stat("upcoming", "Upcoming interviews", upcoming),
        stat("offers", "Offers made", stages.OFFER),
      ],
      series: [
        { key: "applicants", label: "Applicants", points: fillDays(applicants, days) },
        { key: "interviews", label: "Interviews", points: fillDays(interviews, days) },
      ],
    };
  }

  private window(query: DashboardQuery, now: Date) {
    const count = DASHBOARD_RANGE_DAYS[query.range];
    return { days: lastDays(now, count, query.tz), since: rangeStart(now, count) };
  }

  private perDay(sql: Prisma.Sql): Promise<DayRow[]> {
    return this.prisma.$queryRaw<DayRow[]>(sql);
  }
}

/** Applications that got as far as an interview, even if they've moved on since. */
const reachedInterview: Prisma.ApplicationWhereInput = {
  OR: [
    { interviews: { some: {} } },
    { stageChanges: { some: { toStage: "INTERVIEW" } } },
    { stage: { in: ["INTERVIEW", "OFFER"] } },
  ],
};

/** Timestamps are stored as UTC without a zone; this names the day in the viewer's zone. */
const localDay = (column: Prisma.Sql, tz: string) =>
  Prisma.sql`to_char((${column} AT TIME ZONE 'UTC') AT TIME ZONE ${tz}, 'YYYY-MM-DD')`;

const stat = (key: string, label: string, value: number): DashboardStat => ({ key, label, value });

function stageCounts(rows: { stage: ApplicationStage; _count: { _all: number } }[]) {
  const by = Object.fromEntries(rows.map((r) => [r.stage, r._count._all])) as Partial<
    Record<ApplicationStage, number>
  >;
  const sum = (stages: ApplicationStage[]) => stages.reduce((n, s) => n + (by[s] ?? 0), 0);
  return {
    total: rows.reduce((n, r) => n + r._count._all, 0),
    ongoing: sum(ONGOING),
    OFFER: by.OFFER ?? 0,
    REJECTED: by.REJECTED ?? 0,
  };
}
