"use client";

import { useState } from "react";
import type { JobSummary } from "@jobify/shared";
import Link from "next/link";
import { JobBrowser } from "@/components/jobs/JobBrowser";

/** Saved tab: un-bookmarking a job removes it from the list. */
export function SavedJobs({ initial }: { initial: JobSummary[] }) {
  const [jobs, setJobs] = useState(initial);
  return (
    <JobBrowser
      key={jobs.map((j) => j.id).join()}
      jobs={jobs}
      onSavedChange={(id, saved) => {
        if (!saved) setJobs((list) => list.filter((j) => j.id !== id));
      }}
      emptyMessage={
        <>
          Nothing saved yet. Tap the bookmark on any job in{" "}
          <Link href="/explore/jobs" className="text-link underline">
            Explore
          </Link>{" "}
          to keep it here.
        </>
      }
    />
  );
}
