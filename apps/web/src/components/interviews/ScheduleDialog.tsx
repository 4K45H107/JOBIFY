"use client";

import { useState } from "react";
import { type Interview, interviewScheduleSchema } from "@jobify/shared";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/Field";
import { TextField } from "@/components/ui/TextField";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { toLocalInput } from "@/lib/time";

/** Figma "Job Management" schedule popover: Date, Time, Confirm (plus round and length). */
export function ScheduleDialog({
  title,
  applicationId,
  interview,
  onDone,
  onClose,
}: {
  title: string;
  /** New interview for this application… */
  applicationId?: string;
  /** …or reschedule this one. */
  interview?: Interview;
  onDone: (interview: Interview) => void;
  onClose: () => void;
}) {
  const initial = interview ? toLocalInput(interview.scheduledAt) : "";
  const [date, setDate] = useState(initial.slice(0, 10));
  const [time, setTime] = useState(initial.slice(11, 16) || "10:00");
  const [duration, setDuration] = useState(String(interview?.durationMin ?? 45));
  const [stage, setStage] = useState(interview?.stage ?? "Technical interview");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setError(null);
    // The inputs are local time; the API wants an absolute instant.
    const local = new Date(`${date}T${time}`);
    if (!date || Number.isNaN(local.getTime())) return setError("Pick a date and time");
    const parsed = interviewScheduleSchema.safeParse({
      stage,
      scheduledAt: local.toISOString(),
      durationMin: Number(duration),
    });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Check the details");
    setBusy(true);
    try {
      onDone(
        interview
          ? await api<Interview>(`/interviews/${interview.id}`, {
              method: "PATCH",
              json: parsed.data,
            })
          : await api<Interview>(`/applications/${applicationId}/interviews`, {
              method: "POST",
              json: parsed.data,
            }),
      );
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't schedule the interview.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="schedule-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-md flex-col gap-4 rounded-[10px] bg-bg p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="schedule-title" className="text-xl font-medium">
          {title}
        </h2>
        {error && <Alert>{error}</Alert>}
        <TextField
          label="Round"
          value={stage}
          onChange={(e) => setStage(e.target.value)}
          placeholder="e.g. Preli Exam"
        />
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Date"
            type="date"
            value={date}
            min={toLocalInput(new Date().toISOString()).slice(0, 10)}
            onChange={(e) => setDate(e.target.value)}
          />
          <TextField
            label="Time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>
        <SelectField label="Length" value={duration} onChange={(e) => setDuration(e.target.value)}>
          {[15, 30, 45, 60, 90, 120].map((m) => (
            <option key={m} value={m}>
              {m} minutes
            </option>
          ))}
        </SelectField>
        <p className="text-xs text-fg-subtle">
          Times are in your time zone ({Intl.DateTimeFormat().resolvedOptions().timeZone}).
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={confirm} disabled={busy}>
            {busy ? "Saving…" : "Confirm"}
          </Button>
        </div>
      </div>
    </div>
  );
}
