"use client";

import { useEffect, useState } from "react";
import type { InterviewNotes } from "@jobify/shared";
import { api } from "@/lib/api/client";
import { formatWhen } from "@/lib/time";

/** The notes the candidate wrote during the call, read-only, loaded when Details opens. */
export function CallNotes({ interviewId }: { interviewId: string }) {
  const [notes, setNotes] = useState<InterviewNotes | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api<InterviewNotes>(`/interviews/${interviewId}/notes`)
      .then(setNotes)
      .catch(() => setFailed(true));
  }, [interviewId]);

  return (
    // Sits in the interview's details list, so a term and its description.
    <div className="sm:col-span-3">
      <dt className="text-fg-subtle">Notes from the call</dt>
      <dd>
        {failed ? (
          <p className="text-fg-subtle">Couldn&apos;t load the notes.</p>
        ) : !notes ? (
          <p className="text-fg-subtle">Loading…</p>
        ) : (
          <>
            <p
              className="mt-1 max-h-64 overflow-y-auto rounded-[8px] bg-bg p-3 whitespace-pre-wrap"
              tabIndex={0}
            >
              {notes.notes}
            </p>
            {notes.updatedAt && (
              <p className="mt-1 text-xs text-fg-subtle">
                Last saved {formatWhen(notes.updatedAt)}
              </p>
            )}
          </>
        )}
      </dd>
    </div>
  );
}
