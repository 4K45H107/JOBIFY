import { z } from "zod";
import { ApplicationStage } from "./application";
import type { UserRole } from "./roles";

export const NotificationType = z.enum([
  "APPLICATION_SUBMITTED",
  "APPLICATION_STAGE_CHANGED",
  "ASSESSMENT_ASSIGNED",
  "INTERVIEW_SCHEDULED",
  "INTERVIEW_REMINDER",
  "COMPANY_JOIN_REQUESTED",
  "COMPANY_JOIN_DECIDED",
  "JOB_ALERT_MATCH",
]);
export type NotificationType = z.infer<typeof NotificationType>;

export const notificationSchema = z.object({
  id: z.string(),
  type: NotificationType,
  title: z.string(),
  body: z.string(),
  /** Where clicking the notification goes. */
  href: z.string(),
  readAt: z.string().nullable(),
  createdAt: z.string(),
});
export type Notification = z.infer<typeof notificationSchema>;

export const notificationFeedSchema = z.object({
  items: z.array(notificationSchema),
  unread: z.number(),
  nextCursor: z.string().nullable(),
});
export type NotificationFeed = z.infer<typeof notificationFeedSchema>;

export const notificationFeedQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const STAGE_TEXT: Record<ApplicationStage, string> = {
  APPLIED: "was received",
  TESTING: "is waiting for your skill test",
  SHORTLISTED: "has been shortlisted",
  INTERVIEW: "has moved to the interview stage",
  OFFER: "has an offer for you",
  REJECTED: "wasn't selected this time",
  WITHDRAWN: "was withdrawn",
};

/**
 * Human text and link for a stored notification. Shared so the API feed and the
 * live stream render the same way. Payload fields are optional: older rows may lack some.
 */
export function describeNotification(
  type: NotificationType,
  payload: Record<string, unknown>,
  role: UserRole,
): { title: string; body: string; href: string } {
  const str = (key: string, fallback = "") =>
    typeof payload[key] === "string" ? (payload[key] as string) : fallback;
  const job = str("jobTitle", "a job");
  const company = str("company", "the company");
  const employer = role === "EMPLOYER";

  switch (type) {
    case "APPLICATION_SUBMITTED":
      return {
        title: `New applicant for ${job}`,
        body: `${str("applicant", "Someone")} applied.`,
        href: payload.jobId ? `/employer/jobs/${str("jobId")}/applicants` : "/employer",
      };
    case "APPLICATION_STAGE_CHANGED": {
      const stage = ApplicationStage.safeParse(payload.stage);
      return {
        title: `${company}: application update`,
        body: `Your application for ${job} ${stage.success ? STAGE_TEXT[stage.data] : "has changed"}.`,
        href: "/activities?tab=applications",
      };
    }
    case "ASSESSMENT_ASSIGNED":
      return {
        title: `Skill test for ${job}`,
        body: `${company} asks you to take a short timed test.`,
        href: payload.applicationId
          ? `/applications/${str("applicationId")}/test`
          : "/activities?tab=applications",
      };
    case "INTERVIEW_SCHEDULED":
      return {
        title: "Interview scheduled",
        body: `${job} at ${company}.`,
        href: employer ? "/employer/interviews" : "/interviews",
      };
    case "INTERVIEW_REMINDER":
      return {
        title: "Interview starting soon",
        body: `${job} at ${company}.`,
        href: employer ? "/employer/interviews" : "/interviews",
      };
    case "COMPANY_JOIN_REQUESTED":
      return {
        title: "Join request",
        body: `${str("name", "An employer")}${payload.designation ? ` (${str("designation")})` : ""} wants to join ${company}.`,
        href: "/employer/company",
      };
    case "COMPANY_JOIN_DECIDED":
      return payload.approved
        ? {
            title: `Welcome to ${company}`,
            body: "Your request to join was approved.",
            href: "/employer",
          }
        : {
            title: "Join request declined",
            body: `${company} declined your request.`,
            href: "/employer/onboarding",
          };
    case "JOB_ALERT_MATCH":
      return {
        title: `New jobs for “${str("alert", "your alert")}”`,
        body: `${payload.count ?? "New"} new matching jobs.`,
        href: "/activities?tab=alerts",
      };
  }
}

/** Redis pub/sub channel that carries new notification rows to every API instance. */
export const NOTIFICATIONS_CHANNEL = "jobify:notifications";

/** What goes over NOTIFICATIONS_CHANNEL: the stored row, JSON-encoded. */
export const notificationRowSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: NotificationType,
  payload: z.record(z.string(), z.unknown()),
  readAt: z.string().nullable(),
  createdAt: z.string(),
});
export type NotificationRow = z.infer<typeof notificationRowSchema>;
