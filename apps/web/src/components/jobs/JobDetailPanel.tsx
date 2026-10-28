"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { JobDetail } from "@jobify/shared";
import { CompanyLogo } from "@/components/company/CompanyLogo";
import { cn } from "@/lib/cn";
import { formatDate, formatPlace, formatSalary, timeAgo } from "@/lib/format";
import { JOB_TYPE_LABELS, WORKPLACE_LABELS } from "@/lib/labels";
import { SaveButton } from "./SaveButton";

/**
 * Figma right-hand job panel: header with Easy Apply and bookmark, description with "Show more".
 * Employers pass their own `actions` (edit, close) and links into the employer area.
 */
export function JobDetailPanel({
  job,
  onSavedChange,
  collapsible = true,
  actions,
  companyHref = `/companies/${job.company.slug}`,
  fullPageHref = `/jobs/${job.id}`,
}: {
  job: JobDetail;
  onSavedChange?: (saved: boolean) => void;
  collapsible?: boolean;
  actions?: React.ReactNode;
  companyHref?: string;
  fullPageHref?: string | null;
}) {
  const [expanded, setExpanded] = useState(!collapsible);
  const long = job.description.length > 600;

  return (
    <article className="flex flex-col gap-4 rounded-[10px] border border-border p-5 md:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={companyHref} className="flex items-center gap-2 hover:underline">
            <CompanyLogo
              name={job.company.name}
              src={job.company.logoUrl}
              className="size-7 rounded-md text-xs"
            />
            <span className="text-sm tracking-label uppercase">{job.company.name}</span>
          </Link>
          <h2 className="mt-2 text-2xl font-medium md:text-3xl">{job.title}</h2>
          <p className="text-fg-muted">
            {WORKPLACE_LABELS[job.workplace]} · {formatPlace(job.city, job.country)} ·{" "}
            {JOB_TYPE_LABELS[job.type]}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {actions ?? <SeekerActions job={job} onSavedChange={onSavedChange} />}
        </div>
      </header>

      <dl className="grid grid-cols-2 gap-3 rounded-[10px] bg-surface-grey p-4 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-fg-subtle">Salary</dt>
          <dd className="font-medium">{formatSalary(job.salaryMin, job.salaryMax)}</dd>
        </div>
        <div>
          <dt className="text-fg-subtle">Posted</dt>
          <dd className="font-medium">{timeAgo(job.createdAt)} ago</dd>
        </div>
        <div>
          <dt className="text-fg-subtle">Apply by</dt>
          <dd className="font-medium">{job.deadline ? formatDate(job.deadline) : "Open"}</dd>
        </div>
        <div>
          <dt className="text-fg-subtle">Applicants</dt>
          <dd className="font-medium">{job.applicants}</dd>
        </div>
      </dl>

      {(job.hasAssessment || job.ageMin !== null || job.ageMax !== null) && (
        <ul className="flex flex-wrap gap-2 text-sm">
          {job.hasAssessment && (
            <li className="rounded-full bg-chip/30 px-3 py-1">Includes a skill test</li>
          )}
          {(job.ageMin !== null || job.ageMax !== null) && (
            <li className="rounded-full bg-surface-muted px-3 py-1">
              Age {job.ageMin ?? "any"}–{job.ageMax ?? "any"}
            </li>
          )}
        </ul>
      )}

      {job.skills.length > 0 && (
        <section>
          <h3 className="mb-2 font-semibold">Skills</h3>
          <ul className="flex flex-wrap gap-2">
            {job.skills.map((s) => (
              <li key={s} className="rounded-full border border-border px-3 py-1 text-sm">
                {s}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h3 className="mb-2 font-semibold">Job description</h3>
        <p
          className={cn(
            "whitespace-pre-line text-fg-muted",
            !expanded && long && "line-clamp-[10]",
          )}
        >
          {job.description}
        </p>
        {collapsible && long && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-2 text-sm text-link hover:underline"
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        )}
      </section>

      <footer className="text-sm text-fg-subtle">
        Posted by {job.postedBy.fullName}
        {fullPageHref && (
          <>
            {" · "}
            <Link href={fullPageHref} className="text-link hover:underline">
              Open full page
            </Link>
          </>
        )}
      </footer>
    </article>
  );
}

function SeekerActions({
  job,
  onSavedChange,
}: {
  job: JobDetail;
  onSavedChange?: (saved: boolean) => void;
}) {
  return (
    <>
      <SaveButton jobId={job.id} initial={job.saved} onChange={onSavedChange} />
      {job.applied ? (
        <span className="rounded-[6px] bg-surface-muted px-3 py-1.5 text-sm font-medium">
          Applied
        </span>
      ) : (
        <Link
          href={`/jobs/${job.id}/apply`}
          className="flex items-center gap-1 rounded-[6px] bg-success/60 px-3 py-1.5 text-sm font-medium text-fg hover:bg-success/80"
        >
          <Image src="/icons/easy-apply.png" alt="" width={18} height={18} />
          Easy Apply
        </Link>
      )}
    </>
  );
}
