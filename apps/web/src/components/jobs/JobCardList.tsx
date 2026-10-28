"use client";

import Link from "next/link";
import type { JobSummary } from "@jobify/shared";
import { JobCard } from "./JobCard";

/** Figma "Search" layout: full-width cards that open the job page. */
export function JobCardList({
  jobs,
  emptyMessage,
}: {
  jobs: JobSummary[];
  emptyMessage: React.ReactNode;
}) {
  if (jobs.length === 0) {
    return (
      <p className="rounded-[10px] bg-surface-grey p-8 text-center text-fg-subtle">
        {emptyMessage}
      </p>
    );
  }
  return (
    <ul className="flex flex-col">
      {jobs.map((job) => (
        <li key={job.id}>
          <JobCard
            job={job}
            action={
              <Link
                href={`/jobs/${job.id}`}
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
