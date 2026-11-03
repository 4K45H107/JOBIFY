"use client";

import "@livekit/components-styles";
import { LiveKitRoom, VideoConference } from "@livekit/components-react";
import { DisconnectReason } from "livekit-client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Interview, JoinToken } from "@jobify/shared";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { InterviewNotepad } from "./InterviewNotepad";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";

/** Figma "Zoom": meeting title on top, the call below. Employers can end the interview. */
export function InterviewRoom({
  interview,
  viewer,
}: {
  interview: Interview;
  viewer: "SEEKER" | "EMPLOYER";
}) {
  const router = useRouter();
  const back = viewer === "EMPLOYER" ? "/employer/interviews" : "/interviews";
  const [join, setJoin] = useState<JoinToken | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** The other side closed the room (the interviewer pressed End interview). */
  const [ended, setEnded] = useState(false);
  /** Set while this person is ending it, so their own disconnect isn't shown as "ended". */
  const ending = useRef(false);
  const [notepadOpen, setNotepadOpen] = useState(false);
  /** The interviewer hasn't seen the candidate's latest writing yet. */
  const [unseen, setUnseen] = useState(false);

  useEffect(() => {
    api<JoinToken>(`/interviews/${interview.id}/join`, { method: "POST" })
      .then(setJoin)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Couldn't join the room."));
  }, [interview.id]);

  const end = async () => {
    if (!confirm("End the interview for everyone?")) return;
    ending.current = true;
    await api(`/interviews/${interview.id}`, {
      method: "PATCH",
      json: { status: "COMPLETED" },
    }).catch(() => {});
    router.push(back);
  };

  return (
    <div className="flex h-full min-h-[480px] flex-col gap-3">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl">
          <span className="font-semibold">Meeting title:</span> {interview.company.name}{" "}
          {interview.job.title} interview ({interview.stage})
        </h1>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={notepadOpen ? "primary" : "outline"}
            aria-expanded={notepadOpen}
            aria-controls="interview-notepad"
            onClick={() => {
              setNotepadOpen((v) => !v);
              setUnseen(false);
            }}
            className="relative"
          >
            Notepad
            {unseen && !notepadOpen && (
              <span
                aria-label="new writing"
                className="absolute -top-1 -right-1 size-3 rounded-full border-2 border-bg bg-heading-accent"
              />
            )}
          </Button>
          {viewer === "EMPLOYER" && (
            <Button size="sm" variant="outline" onClick={end}>
              End interview
            </Button>
          )}
          <Link
            href={back}
            className="inline-flex h-9 items-center rounded-[10px] px-4 text-sm tracking-label uppercase hover:bg-surface-grey"
          >
            Leave
          </Link>
        </div>
      </header>
      {ended ? (
        <section
          role="status"
          className="flex flex-1 flex-col items-center justify-center gap-4 rounded-[10px] bg-surface-grey p-8 text-center"
        >
          <p className="text-2xl font-medium">
            {viewer === "SEEKER"
              ? "The interviewer ended the interview"
              : "This interview has ended"}
          </p>
          {viewer === "SEEKER" && (
            <p className="text-fg-subtle">
              Thanks for joining. You&apos;ll hear back from them here.
            </p>
          )}
          <Link
            href={back}
            className="inline-flex h-10 items-center rounded-full bg-primary px-8 font-medium tracking-label text-primary-fg uppercase hover:opacity-90"
          >
            Back to interviews
          </Link>
        </section>
      ) : error ? (
        <Alert>{error}</Alert>
      ) : !join ? (
        <div
          className="flex-1 animate-pulse rounded-[10px] bg-surface-grey"
          aria-label="Connecting"
        />
      ) : (
        <LiveKitRoom
          data-lk-theme="default"
          serverUrl={join.url}
          token={join.token}
          connect
          video
          audio
          onDisconnected={(reason) => {
            // Closed from the server: tell the person rather than drop them silently.
            // The person ending it is already on their way back (see end()).
            if (ending.current) return;
            if (reason === DisconnectReason.ROOM_DELETED) setEnded(true);
            else router.push(back);
          }}
          className="flex-1 overflow-hidden rounded-[10px]"
        >
          {/* Video beside the notepad on wide screens, above it on phones. The notepad stays
              mounted while hidden, so the interviewer keeps receiving what's written. */}
          <div className="flex h-full min-h-0 flex-col gap-3 lg:flex-row">
            <div className="min-h-[320px] min-w-0 flex-1">
              <VideoConference />
            </div>
            <div
              id="interview-notepad"
              className={cn("h-72 shrink-0 lg:h-auto lg:w-[380px]", !notepadOpen && "hidden")}
            >
              <InterviewNotepad
                interviewId={interview.id}
                viewer={viewer}
                seekerId={interview.seeker.id}
                onActivity={() => !notepadOpen && setUnseen(true)}
              />
            </div>
          </div>
        </LiveKitRoom>
      )}
    </div>
  );
}
