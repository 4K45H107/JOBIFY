import { z } from "zod";

export const InterviewStatus = z.enum(["SCHEDULED", "LIVE", "COMPLETED", "CANCELLED"]);
export type InterviewStatus = z.infer<typeof InterviewStatus>;

/** The room opens this long before the start, and stays joinable this long after the end. */
export const JOIN_EARLY_MIN = 10;
export const JOIN_LATE_MIN = 15;

export const interviewScheduleSchema = z.object({
  /** Free-text round name, e.g. "Preli Exam" or "Final round" (Figma "Interviews"). */
  stage: z.string().trim().min(2, "Name the round, e.g. Technical interview").max(60),
  scheduledAt: z.iso.datetime({ offset: true, message: "Pick a date and time" }),
  durationMin: z.number().int().min(15, "At least 15 minutes").max(240, "At most 4 hours"),
});
export type InterviewSchedule = z.infer<typeof interviewScheduleSchema>;

export const interviewUpdateSchema = interviewScheduleSchema
  .partial()
  .extend({ status: z.enum(["CANCELLED", "COMPLETED"]).optional() });
export type InterviewUpdate = z.infer<typeof interviewUpdateSchema>;

export const interviewSchema = z.object({
  id: z.string(),
  applicationId: z.string(),
  stage: z.string(),
  scheduledAt: z.string(),
  endsAt: z.string(),
  durationMin: z.number(),
  status: InterviewStatus,
  job: z.object({ id: z.string(), title: z.string() }),
  company: z.object({ name: z.string(), slug: z.string(), logoUrl: z.string().nullable() }),
  seeker: z.object({ id: z.string(), fullName: z.string(), photoUrl: z.string().nullable() }),
  interviewer: z.object({ id: z.string(), fullName: z.string() }),
  /** True while the room is open for this viewer. */
  canJoin: z.boolean(),
});
export type Interview = z.infer<typeof interviewSchema>;

export const interviewListQuerySchema = z.object({
  scope: z.enum(["upcoming", "past"]).default("upcoming"),
  jobId: z.string().optional(),
});
export type InterviewListQuery = z.infer<typeof interviewListQuerySchema>;

export const joinTokenSchema = z.object({
  /** LiveKit server URL (wss://… in production). */
  url: z.string(),
  token: z.string(),
  roomName: z.string(),
  identity: z.string(),
});
export type JoinToken = z.infer<typeof joinTokenSchema>;

/** Whether the room is open at `now` for an interview with this start, length and status. */
export function isJoinable(
  scheduledAt: Date,
  durationMin: number,
  status: InterviewStatus,
  now = new Date(),
): boolean {
  if (status === "CANCELLED" || status === "COMPLETED") return false;
  const opens = scheduledAt.getTime() - JOIN_EARLY_MIN * 60_000;
  const closes = scheduledAt.getTime() + (durationMin + JOIN_LATE_MIN) * 60_000;
  return now.getTime() >= opens && now.getTime() <= closes;
}
