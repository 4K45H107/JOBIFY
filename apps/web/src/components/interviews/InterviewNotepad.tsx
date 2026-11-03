"use client";

import { useRoomContext } from "@livekit/components-react";
import { RoomEvent } from "livekit-client";
import { useEffect, useRef, useState } from "react";
import {
  CODING_LANGUAGE_LABELS,
  CodingLanguage,
  type InterviewNotes,
  MAX_INTERVIEW_NOTES,
  NOTES_TOPIC,
} from "@jobify/shared";
import { CodeEditor } from "@/components/coding/CodeEditor";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { cn } from "@/lib/cn";

/** How often the candidate's text goes to the interviewer, and how long before it's saved. */
const SEND_EVERY_MS = 400;
const SAVE_AFTER_MS = 1500;

type SaveState = "idle" | "saving" | "saved" | "failed" | "locked";

/** What goes over the room: the text and its mode (a language for code, null for plain text). */
interface NotepadMessage {
  notes: string;
  language: CodingLanguage | null;
}

const encode = (m: NotepadMessage) => JSON.stringify(m);

function decode(raw: string): NotepadMessage {
  try {
    const m = JSON.parse(raw) as Partial<NotepadMessage>;
    if (typeof m.notes === "string") {
      const language = CodingLanguage.safeParse(m.language);
      return { notes: m.notes, language: language.success ? language.data : null };
    }
  } catch {
    // Not JSON: treat it as plain text.
  }
  return { notes: raw, language: null };
}

/**
 * The call's notepad. The candidate types plain text, or code with syntax highlighting; the
 * interviewer sees it live (over the LiveKit room's text streams) and read-only. It's autosaved,
 * so the interviewer sees it on joining late, and both can read it after the interview.
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
  const [language, setLanguage] = useState<CodingLanguage | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [editable, setEditable] = useState(false);
  const [save, setSave] = useState<SaveState>("idle");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const latest = useRef<NotepadMessage>({ notes: "", language: null });
  const dirty = useRef(false);
  const onActivityRef = useRef(onActivity);
  onActivityRef.current = onActivity;

  // What's been written so far (also covers joining late or rejoining).
  useEffect(() => {
    api<InterviewNotes>(`/interviews/${interviewId}/notes`)
      .then((n) => {
        latest.current = { notes: n.notes, language: n.language };
        setText(n.notes);
        setLanguage(n.language);
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
      const next = decode(await reader.readAll());
      latest.current = next;
      setText(next.notes);
      setLanguage(next.language);
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
      void room.localParticipant
        .sendText(encode(latest.current), { topic: NOTES_TOPIC })
        .catch(() => {});
    }, SEND_EVERY_MS);
    return () => clearTimeout(timer);
  }, [room, writer, text, language]);

  useEffect(() => {
    if (!writer) return;
    const resend = () => {
      if (latest.current.notes || latest.current.language)
        void room.localParticipant
          .sendText(encode(latest.current), { topic: NOTES_TOPIC })
          .catch(() => {});
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
          json: latest.current,
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
  }, [writer, interviewId, text, language]);

  const edit = (next: string) => {
    dirty.current = true;
    latest.current = { ...latest.current, notes: next };
    setText(next);
  };

  /** Plain text or code in a language; the text itself is kept either way. */
  const switchMode = (next: CodingLanguage | null) => {
    dirty.current = true;
    latest.current = { ...latest.current, language: next };
    setLanguage(next);
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
        {writer ? (
          <label className="flex items-center gap-2 text-xs">
            <span className="text-fg-subtle">Mode</span>
            <select
              value={language ?? "text"}
              disabled={!editable || !loaded}
              onChange={(e) =>
                switchMode(e.target.value === "text" ? null : CodingLanguage.parse(e.target.value))
              }
              className="h-8 rounded-[6px] border border-border bg-bg px-2 text-sm"
            >
              <option value="text">Plain text</option>
              {CodingLanguage.options.map((l) => (
                <option key={l} value={l}>
                  Code · {CODING_LANGUAGE_LABELS[l]}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <span className="flex items-center gap-1.5 text-xs text-fg-subtle">
            <span aria-hidden className="size-2 rounded-full bg-success" />
            Live from the candidate
            {language && <> · {CODING_LANGUAGE_LABELS[language]}</>}
          </span>
        )}
      </header>
      {language ? (
        // Code mode: highlighted for both; read-only for the interviewer.
        <CodeEditor
          label={writer ? "Your code" : "The candidate's code"}
          language={language}
          value={text}
          onChange={writer ? edit : undefined}
          readOnly={!writer || !editable || !loaded}
          className="min-h-40 flex-1"
        />
      ) : writer ? (
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
