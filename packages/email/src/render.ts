import { render } from "@react-email/render";
import {
  describeNotification,
  emailTypeLabel,
  type NotificationType,
  type UserRole,
} from "@jobify/shared";
import { NotificationEmail } from "./templates/NotificationEmail";

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const ACTION_LABELS: Record<NotificationType, string> = {
  APPLICATION_SUBMITTED: "Review applicants",
  APPLICATION_STAGE_CHANGED: "View your applications",
  ASSESSMENT_ASSIGNED: "Take the test",
  INTERVIEW_SCHEDULED: "See your interviews",
  INTERVIEW_REMINDER: "Go to your interview",
  COMPANY_JOIN_REQUESTED: "Review the request",
  COMPANY_JOIN_DECIDED: "Open Jobify",
  JOB_ALERT_MATCH: "See the jobs",
};

/** "Mon 3 Nov, 2:30 pm GMT+6": we don't know each person's time zone, so name the one used. */
export function formatWhen(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone,
    timeZoneName: "short",
  }).format(new Date(iso));
}

function interviewDetail(
  type: NotificationType,
  payload: Record<string, unknown>,
  timeZone: string,
): string | undefined {
  if (type !== "INTERVIEW_SCHEDULED" && type !== "INTERVIEW_REMINDER") return undefined;
  if (typeof payload.scheduledAt !== "string") return undefined;
  const when = formatWhen(payload.scheduledAt, timeZone);
  return payload.cancelled ? `It was planned for ${when}.` : `When: ${when}`;
}

/**
 * The email for a stored notification. Title, text and link come from describeNotification,
 * the same text the in-app bell shows, so the two never disagree.
 */
export async function renderNotificationEmail(input: {
  type: NotificationType;
  payload: Record<string, unknown>;
  role: UserRole;
  name: string | null;
  webOrigin: string;
  unsubscribeUrl: string;
  timeZone: string;
}): Promise<RenderedEmail> {
  const { title, body, href } = describeNotification(input.type, input.payload, input.role);
  const settingsPath = input.role === "EMPLOYER" ? "/employer/settings" : "/settings";
  const element = NotificationEmail({
    greetingName: input.name?.split(" ")[0] ?? null,
    title,
    body,
    detail: interviewDetail(input.type, input.payload, input.timeZone),
    actionLabel: ACTION_LABELS[input.type],
    actionUrl: new URL(href, input.webOrigin).toString(),
    categoryLabel: emailTypeLabel(input.role, input.type),
    settingsUrl: new URL(`${settingsPath}?section=email`, input.webOrigin).toString(),
    unsubscribeUrl: input.unsubscribeUrl,
  });
  return {
    subject: title,
    html: await render(element),
    text: await render(element, { plainText: true }),
  };
}
