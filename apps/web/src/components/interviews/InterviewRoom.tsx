"use client";

import "@livekit/components-styles";
import { LiveKitRoom, VideoConference } from "@livekit/components-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Interview, JoinToken } from "@jobify/shared";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
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

  useEffect(() => {
    api<JoinToken>(`/interviews/${interview.id}/join`, { method: "POST" })
      .then(setJoin)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Couldn't join the room."));
  }, [interview.id]);

  const end = async () => {
    if (!confirm("End the interview for everyone?")) return;
    await api(`/interviews/${interview.id}`, {
      method: "PATCH",
      json: { status: "COMPLETED" },
    }).catch(() => {});
    router.push(back);
  };

  return (
    <div className="flex h-[calc(100dvh-12rem)] min-h-[480px] flex-col gap-3">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl">
          <span className="font-semibold">Meeting title:</span> {interview.company.name}{" "}
          {interview.job.title} interview ({interview.stage})
        </h1>
        <div className="flex gap-2">
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
      {error ? (
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
          onDisconnected={() => router.push(back)}
          className="flex-1 overflow-hidden rounded-[10px]"
        >
          <VideoConference />
        </LiveKitRoom>
      )}
    </div>
  );
}
