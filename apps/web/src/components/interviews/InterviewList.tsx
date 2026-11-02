"use client";

import { useState } from "react";
import type { Interview } from "@jobify/shared";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { InterviewCard } from "./InterviewCard";
import { ScheduleDialog } from "./ScheduleDialog";
import { EmptyState } from "@/components/ui/EmptyState";

export function InterviewList({
  initial,
  viewer,
  emptyMessage,
}: {
  initial: Interview[];
  viewer: "SEEKER" | "EMPLOYER";
  emptyMessage: React.ReactNode;
}) {
  const [items, setItems] = useState(initial);
  const [editing, setEditing] = useState<Interview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const base = viewer === "EMPLOYER" ? "/employer/interviews" : "/interviews";
  const replace = (next: Interview) =>
    setItems((list) => list.map((i) => (i.id === next.id ? next : i)));

  const setStatus = async (i: Interview, status: "CANCELLED" | "COMPLETED") => {
    if (
      status === "CANCELLED" &&
      !confirm(`Cancel the ${i.stage} with ${i.seeker.fullName}? They'll be notified.`)
    )
      return;
    setError(null);
    try {
      replace(await api<Interview>(`/interviews/${i.id}`, { method: "PATCH", json: { status } }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't update the interview.");
    }
  };

  if (items.length === 0) return <EmptyState>{emptyMessage}</EmptyState>;
  return (
    <>
      {error && <p className="text-sm text-heading-accent">{error}</p>}
      <ul className="flex flex-col gap-3">
        {items.map((i) => (
          <InterviewCard
            key={i.id}
            interview={i}
            viewer={viewer}
            roomHref={`${base}/${i.id}/room`}
            actions={
              viewer === "EMPLOYER" && (i.status === "SCHEDULED" || i.status === "LIVE") ? (
                <>
                  <Button size="sm" variant="outline" onClick={() => setEditing(i)}>
                    Reschedule
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setStatus(i, "COMPLETED")}>
                    Mark completed
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setStatus(i, "CANCELLED")}>
                    Cancel
                  </Button>
                </>
              ) : undefined
            }
          />
        ))}
      </ul>
      {editing && (
        <ScheduleDialog
          title={`Reschedule · ${editing.seeker.fullName}`}
          interview={editing}
          onClose={() => setEditing(null)}
          onDone={(next) => {
            replace(next);
            setEditing(null);
          }}
        />
      )}
    </>
  );
}
