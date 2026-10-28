"use client";

import Image from "next/image";
import { useState } from "react";
import { api } from "@/lib/api/client";
import { cn } from "@/lib/cn";

/** Figma bookmark toggle. Optimistic; reverts if the request fails. */
export function SaveButton({
  jobId,
  initial,
  onChange,
  className,
}: {
  jobId: string;
  initial: boolean;
  onChange?: (saved: boolean) => void;
  className?: string;
}) {
  const [saved, setSaved] = useState(initial);
  const [busy, setBusy] = useState(false);

  const toggle = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const next = !saved;
    setSaved(next);
    setBusy(true);
    try {
      await api(`/jobs/${jobId}/save`, { method: next ? "POST" : "DELETE" });
      onChange?.(next);
    } catch {
      setSaved(!next);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={saved}
      aria-label={saved ? "Remove from saved jobs" : "Save job"}
      title={saved ? "Saved" : "Save"}
      className={cn(
        "rounded p-1 transition hover:bg-surface-grey",
        saved && "bg-chip/40",
        className,
      )}
    >
      <Image
        src="/icons/bookmark.png"
        alt=""
        width={20}
        height={20}
        className="icon-themed size-5"
      />
    </button>
  );
}
