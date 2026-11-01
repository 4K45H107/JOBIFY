import { z } from "zod";
import { NotificationType } from "./notification";
import type { UserRole } from "./roles";

/** BullMQ queue the API and the worker add email jobs to. One job per notification. */
export const EMAIL_QUEUE = "email";

export const emailJobSchema = z.object({ notificationId: z.string() });
export type EmailJob = z.infer<typeof emailJobSchema>;

/** The kinds of email a role can receive, in display order, with Settings text. */
export const EMAIL_TYPES: Record<
  UserRole,
  { type: NotificationType; label: string; description: string }[]
> = {
  SEEKER: [
    {
      type: "APPLICATION_STAGE_CHANGED",
      label: "Application updates",
      description: "When an employer shortlists, moves or declines your application.",
    },
    {
      type: "ASSESSMENT_ASSIGNED",
      label: "Skill tests",
      description: "When an application asks you to take a timed test.",
    },
    {
      type: "INTERVIEW_SCHEDULED",
      label: "Interview schedule",
      description: "When an interview is scheduled, rescheduled or cancelled.",
    },
    {
      type: "INTERVIEW_REMINDER",
      label: "Interview reminders",
      description: "15 minutes before an interview starts.",
    },
  ],
  EMPLOYER: [
    {
      type: "APPLICATION_SUBMITTED",
      label: "New applicants",
      description: "When someone applies to a job you posted.",
    },
    {
      type: "INTERVIEW_REMINDER",
      label: "Interview reminders",
      description: "15 minutes before an interview you scheduled starts.",
    },
    {
      type: "COMPANY_JOIN_REQUESTED",
      label: "Join requests",
      description: "When someone asks to join your company (company admins).",
    },
    {
      type: "COMPANY_JOIN_DECIDED",
      label: "Join request decisions",
      description: "When a company approves or declines your request to join.",
    },
  ],
  ADMIN: [],
};

export const emailPreferenceSchema = z.object({
  type: NotificationType,
  label: z.string(),
  description: z.string(),
  enabled: z.boolean(),
});
export type EmailPreference = z.infer<typeof emailPreferenceSchema>;

export const emailPreferenceUpdateSchema = z.object({
  preferences: z
    .array(z.object({ type: NotificationType, enabled: z.boolean() }))
    .min(1)
    .max(20),
});
export type EmailPreferenceUpdate = z.infer<typeof emailPreferenceUpdateSchema>;

export const unsubscribeSchema = z.object({ token: z.string().min(10).max(500) });

export const unsubscribeResultSchema = z.object({ label: z.string() });
export type UnsubscribeResult = z.infer<typeof unsubscribeResultSchema>;

/** Settings text for a type, or a generic label for types the role doesn't list. */
export function emailTypeLabel(role: UserRole, type: NotificationType): string {
  return EMAIL_TYPES[role].find((t) => t.type === type)?.label ?? "these";
}
