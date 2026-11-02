import { render } from "@react-email/render";
import {
  type AccountEmailKind,
  describeNotification,
  EMAIL_VERIFICATION_TTL_HOURS,
  PASSWORD_RESET_TTL_MINUTES,
  emailTypeLabel,
  type NotificationType,
  type UserRole,
} from "@jobify/shared";
import { AccountEmail } from "./templates/AccountEmail";
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

/**
 * Account emails. The link carries the raw token; it's single-use and expires (see the TTLs).
 * PASSWORD_CHANGED has no token: it's a notice with a link to reset if it wasn't them.
 */
export async function renderAccountEmail(input: {
  kind: AccountEmailKind;
  name: string | null;
  webOrigin: string;
  token?: string;
}): Promise<RenderedEmail> {
  const link = (path: string) => new URL(path, input.webOrigin).toString();
  const withToken = (path: string) =>
    link(`${path}?token=${encodeURIComponent(input.token ?? "")}`);
  const content = {
    VERIFY_EMAIL: {
      subject: "Verify your email for Jobify",
      title: "Verify your email",
      body: [
        "Confirm this is your email address to apply to jobs and post them on Jobify.",
        `The link works for ${EMAIL_VERIFICATION_TTL_HOURS} hours.`,
      ],
      actionLabel: "Verify my email",
      actionUrl: withToken("/verify-email"),
      footerNote:
        "You get this because this address was used to create a Jobify account. If that wasn't you, ignore this email.",
    },
    PASSWORD_RESET: {
      subject: "Reset your Jobify password",
      title: "Reset your password",
      body: [
        "Someone asked to reset the password for this Jobify account. Choose a new one with the button below.",
        `The link works once, for ${PASSWORD_RESET_TTL_MINUTES} minutes.`,
      ],
      actionLabel: "Choose a new password",
      actionUrl: withToken("/reset-password"),
      footerNote: "If you didn't ask for this, ignore this email: your password stays the same.",
    },
    PASSWORD_CHANGED: {
      subject: "Your Jobify password was changed",
      title: "Your password was changed",
      body: [
        "The password for your Jobify account was just changed, and other devices were signed out.",
        "If this wasn't you, reset your password now.",
      ],
      actionLabel: "Reset my password",
      actionUrl: link("/forgot-password"),
      footerNote: "You get this security notice whenever your password changes.",
    },
  }[input.kind];
  const element = AccountEmail({
    greetingName: input.name?.split(" ")[0] ?? null,
    title: content.title,
    body: content.body,
    actionLabel: content.actionLabel,
    actionUrl: content.actionUrl,
    footerNote: content.footerNote,
  });
  return {
    subject: content.subject,
    html: await render(element),
    text: await render(element, { plainText: true }),
  };
}
