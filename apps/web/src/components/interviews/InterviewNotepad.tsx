"use client";

import { useRoomContext } from "@livekit/components-react";
import { RoomEvent } from "livekit-client";
import { useEffect, useRef, useState } from "react";
import { type InterviewNotes, MAX_INTERVIEW_NOTES, NOTES_TOPIC } from "@jobify/shared";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { cn } from "@/lib/cn";

/** How often the candidate's text goes to the interviewer, and how long before it's saved. */
const SEND_EVERY_MS = 400;
const SAVE_AFTER_MS = 1500;

type SaveState = "idle" | "saving" | "saved" | "failed" | "locked";

/**
 * The call's notepad. The candidate types; the interviewer sees it live (over the LiveKit room's
 * text streams) and read-only. The candidate's text is autosaved, so the interviewer sees it on
 * joining late, and both can read it after the interview.
 */
export function InterviewNotepad({
  interviewId,
  viewer,
  seekerId,
  onActivity,
}: {
  interviewId: string;
  viewer: "SEEKER" | "EMPLOYER";
  seekerId: string;
  /** The interviewer is told when new text arrives while the panel is closed. */
  onActivity?: () => void;
}) {
  const room = useRoomContext();
  const writer = viewer === "SEEKER";
  const [text, setText] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [editable, setEditable] = useState(false);
  const [save, setSave] = useState<SaveState>("idle");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const latest = useRef("");
  const dirty = useRef(false);
  const onActivityRef = useRef(onActivity);
  onActivityRef.current = onActivity;

  // What's been written so far (also covers joining late or rejoining).
  useEffect(() => {
    api<InterviewNotes>(`/interviews/${interviewId}/notes`)
      .then((n) => {
        latest.current = n.notes;
        setText(n.notes);
        setEditable(n.editable);
        setUpdatedAt(n.updatedAt ? new Date(n.updatedAt) : null);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [interviewId]);

  // Interviewer: take each update from the candidate.
  useEffect(() => {
    if (writer) return;
    const handler = async (
      reader: { readAll: () => Promise<string> },
      from: { identity: string },
    ) => {
      if (from.identity !== seekerId) return;
      const next = await reader.readAll();
      latest.current = next;
      setText(next);
      setUpdatedAt(new Date());
      onActivityRef.current?.();
    };
    // Registering twice throws (React runs effects twice in development).
    room.unregisterTextStreamHandler(NOTES_TOPIC);
    room.registerTextStreamHandler(NOTES_TOPIC, handler);
    return () => room.unregisterTextStreamHandler(NOTES_TOPIC);
  }, [room, writer, seekerId]);

  // Candidate: send the text live, at most every SEND_EVERY_MS, and again when someone joins.
  useEffect(() => {
    if (!writer || !dirty.current) return;
    const timer = setTimeout(() => {
      void room.localParticipant.sendText(latest.current, { topic: NOTES_TOPIC }).catch(() => {});
    }, SEND_EVERY_MS);
    return () => clearTimeout(timer);
  }, [room, writer, text]);

  useEffect(() => {
    if (!writer) return;
    const resend = () => {
      if (latest.current)
        void room.localParticipant.sendText(latest.current, { topic: NOTES_TOPIC }).catch(() => {});
    };
    room.on(RoomEvent.ParticipantConnected, resend);
    return () => {
      room.off(RoomEvent.ParticipantConnected, resend);
    };
  }, [room, writer]);

  // Candidate: autosave a moment after the last change.
  useEffect(() => {
    if (!writer || !dirty.current || save === "locked") return;
    const timer = setTimeout(async () => {
      setSave("saving");
      try {
        await api(`/interviews/${interviewId}/notes`, {
          method: "PUT",
          json: { notes: latest.current },
        });
        setSave("saved");
        setUpdatedAt(new Date());
      } catch (e) {
        // 409: the interview has ended, so the notes are final.
        if (e instanceof ApiError && e.status === 409) {
          setSave("locked");
          setEditable(false);
        } else setSave("failed");
      }
    }, SAVE_AFTER_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [writer, interviewId, text]);

  const edit = (next: string) => {
    dirty.current = true;
    latest.current = next;
    setText(next);
  };

  const status = writer
    ? {
        idle: editable ? "The interviewer sees what you type." : "",
        saving: "Saving…",
        saved: "Saved. The interviewer sees what you type.",
        failed: "Couldn't save. Keep typing; it will try again.",
        locked: "The interview has ended. Your notes are saved.",
      }[save]
    : updatedAt
      ? `Updated ${updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
      : "Nothing written yet.";

  return (
    <section
      aria-labelledby="notepad-title"
      className="flex h-full min-h-0 flex-col gap-2 rounded-[10px] border border-border bg-bg p-3 text-fg"
    >
      <header className="flex items-center justify-between gap-2">
        <h2 id="notepad-title" className="font-medium">
          Notepad
        </h2>
        {!writer && (
          <span className="flex items-center gap-1.5 text-xs text-fg-subtle">
            <span aria-hidden className="size-2 rounded-full bg-success" />
            Live from the candidate
          </span>
        )}
      </header>
      {writer ? (
        <textarea
          aria-label="Your notes"
          value={text}
          onChange={(e) => edit(e.target.value)}
          readOnly={!editable || !loaded}
          maxLength={MAX_INTERVIEW_NOTES}
          placeholder={loaded ? "Write your answers here…" : "Loading…"}
          className="min-h-40 flex-1 resize-none rounded-[8px] border border-border bg-bg p-3 text-sm leading-relaxed outline-none focus-visible:border-outline"
        />
      ) : (
        <div
          // A region, not a live log: re-reading the whole text on every keystroke would be noise.
          role="region"
          aria-label="The candidate's notes"
          tabIndex={0}
          className={cn(
            "min-h-40 flex-1 overflow-y-auto rounded-[8px] bg-surface-grey p-3 text-sm leading-relaxed whitespace-pre-wrap",
            !text && "text-fg-subtle",
          )}
        >
          {text || (loaded ? "The candidate hasn't written anything yet." : "Loading…")}
        </div>
      )}
      <p className="text-xs text-fg-subtle" role="status">
        {status}
        {writer && text.length > MAX_INTERVIEW_NOTES * 0.9 && (
          <> · {MAX_INTERVIEW_NOTES - text.length} characters left</>
        )}
      </p>
    </section>
  );
}
