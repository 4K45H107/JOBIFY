"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { JobDetail, JobStatus } from "@jobify/shared";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api/client";
import { StatusBadge } from "./JobCard";

/** Status plus Edit and Publish / Close / Reopen for the hiring company's team. */
export function EmployerJobActions({
  job,
  onChanged,
}: {
  job: JobDetail;
  onChanged?: (job: JobDetail) => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const setStatus = async (status: JobStatus) => {
    if (status === "CLOSED" && !confirm("Close this job? It stops accepting applications.")) return;
    setBusy(true);
    try {
      // Call first: `onChanged?.(await api(...))` would skip the request entirely when onChanged is undefined.
      const updated = await api<JobDetail>(`/jobs/${job.id}`, {
        method: "PATCH",
        json: { status },
      });
      onChanged?.(updated);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const next: Record<JobStatus, { status: JobStatus; label: string }> = {
    DRAFT: { status: "OPEN", label: "Publish" },
    OPEN: { status: "CLOSED", label: "Close" },
    CLOSED: { status: "OPEN", label: "Reopen" },
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <StatusBadge status={job.status} />
      <Link
        href={`/employer/jobs/${job.id}/edit`}
        className="inline-flex h-9 items-center rounded-[10px] border border-outline px-4 text-sm font-medium tracking-label uppercase hover:bg-surface-grey"
      >
        Edit
      </Link>
      <Button
        size="sm"
        variant={job.status === "OPEN" ? "outline" : "primary"}
        disabled={busy}
        onClick={() => setStatus(next[job.status].status)}
      >
        {next[job.status].label}
      </Button>
    </div>
  );
}
