"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { JobDetail, JobSummary } from "@jobify/shared";
import { api } from "@/lib/api/client";
import { JobCard } from "./JobCard";
import { EmployerJobActions } from "./EmployerJobActions";
import { JobDetailPanel } from "./JobDetailPanel";

export interface BrowserJob extends JobSummary {
  reasons?: string[];
}

/**
 * Figma master–detail: cards on the left, the selected job on the right.
 * On small screens the cards link to the full job page instead.
 */
export function JobBrowser({
  jobs,
  emptyMessage,
  onSavedChange,
  employer = false,
}: {
  jobs: BrowserJob[];
  emptyMessage: React.ReactNode;
  onSavedChange?: (jobId: string, saved: boolean) => void;
  /** Employer Home: status on cards, manage actions in the panel, links into /employer. */
  employer?: boolean;
}) {
  const jobHref = (id: string) => (employer ? `/employer/jobs/${id}` : `/jobs/${id}`);
  const [selectedId, setSelectedId] = useState(jobs[0]?.id ?? null);
  const [detail, setDetail] = useState<JobDetail | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    setError(false);
    api<JobDetail>(`/jobs/${selectedId}`)
      .then((d) => !cancelled && setDetail(d))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  if (jobs.length === 0) {
    return (
      <p className="rounded-[10px] bg-surface-grey p-8 text-center text-fg-subtle">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <ul className="flex flex-col lg:max-h-[calc(100dvh-14rem)] lg:overflow-y-auto lg:pr-2">
        {jobs.map((job) => (
          <li key={job.id}>
            <JobCard
              job={job}
              selected={job.id === selectedId}
              reasons={job.reasons}
              employerView={employer}
              onSavedChange={(s) => onSavedChange?.(job.id, s)}
              action={
                <>
                  {/* Mobile: open the job page. Desktop: show it in the panel. */}
                  <Link
                    href={jobHref(job.id)}
                    className="absolute inset-0 lg:hidden"
                    aria-label={job.title}
                  />
                  <button
                    type="button"
                    onClick={() => setSelectedId(job.id)}
                    aria-label={`Show ${job.title} at ${job.company.name}`}
                    aria-current={job.id === selectedId ? "true" : undefined}
                    className="absolute inset-0 hidden cursor-pointer lg:block"
                  />
                </>
              }
            />
          </li>
        ))}
      </ul>
      <div className="hidden lg:block lg:max-h-[calc(100dvh-14rem)] lg:overflow-y-auto">
        {error ? (
          <p className="text-fg-subtle">Couldn&apos;t load this job.</p>
        ) : detail && detail.id === selectedId ? (
          <JobDetailPanel
            key={detail.id}
            job={detail}
            onSavedChange={(s) => onSavedChange?.(detail.id, s)}
            {...(employer && {
              actions: <EmployerJobActions job={detail} onChanged={setDetail} />,
              companyHref: "/employer/company",
              fullPageHref: jobHref(detail.id),
            })}
          />
        ) : (
          <div
            className="h-96 animate-pulse rounded-[10px] bg-surface-grey"
            aria-label="Loading job"
          />
        )}
      </div>
    </div>
  );
}
