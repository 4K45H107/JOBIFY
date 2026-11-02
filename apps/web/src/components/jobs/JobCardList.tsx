"use client";

import Link from "next/link";
import type { JobSummary } from "@jobify/shared";
import { JobCard } from "./JobCard";
import { EmptyState } from "@/components/ui/EmptyState";

/** Figma "Search" layout: full-width cards that open the job page. */
export function JobCardList({
  jobs,
  emptyMessage,
  hrefBase = "/jobs",
  employerView = false,
}: {
  jobs: JobSummary[];
  emptyMessage: React.ReactNode;
  /** Employers open jobs under /employer/jobs. */
  hrefBase?: string;
  employerView?: boolean;
}) {
  if (jobs.length === 0) {
    return <EmptyState>{emptyMessage}</EmptyState>;
  }
  return (
    <ul className="flex flex-col">
      {jobs.map((job) => (
        <li key={job.id}>
          <JobCard
            job={job}
            employerView={employerView}
            action={
              <Link
                href={`${hrefBase}/${job.id}`}
                className="absolute inset-0"
                aria-label={`${job.title} at ${job.company.name}`}
              />
            }
          />
        </li>
      ))}
    </ul>
  );
}
