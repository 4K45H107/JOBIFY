import Image from "next/image";
import type { JobStatus, JobSummary } from "@jobify/shared";
import { CompanyLogo } from "@/components/company/CompanyLogo";
import { cn } from "@/lib/cn";
import { formatPlace, formatSalary, timeAgo } from "@/lib/format";
import { WORKPLACE_LABELS } from "@/lib/labels";
import { SaveButton } from "./SaveButton";

/** Figma job card: company, title, place, salary, Easy Apply and age; bookmark on the right. */
export function JobCard({
  job,
  selected = false,
  reasons,
  onSavedChange,
  showSave = true,
  action,
  employerView = false,
}: {
  job: JobSummary;
  selected?: boolean;
  reasons?: string[];
  onSavedChange?: (saved: boolean) => void;
  showSave?: boolean;
  /**
   * Full-card link or button, rendered as a transparent overlay so the bookmark
   * can sit above it without nesting interactive elements.
   */
  action?: React.ReactNode;
  /** Shows status and applicant count instead of Easy Apply (Figma Employer Home). */
  employerView?: boolean;
}) {
  return (
    <article
      className={cn(
        "relative border-b border-fg/70 py-3 pr-2 pl-4 transition",
        selected
          ? "lg:before:absolute lg:before:inset-y-1 lg:before:left-0 lg:before:w-1.5 lg:before:bg-selected"
          : "hover:bg-surface-grey/60",
      )}
    >
      {action}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <CompanyLogo
            name={job.company.name}
            src={job.company.logoUrl}
            className="size-6 rounded-md text-[10px]"
          />
          <span className="truncate text-sm tracking-label uppercase">{job.company.name}</span>
        </div>
        {showSave && !employerView && (
          <SaveButton
            jobId={job.id}
            initial={job.saved}
            onChange={onSavedChange}
            className="relative z-10"
          />
        )}
      </div>
      <h3 className="mt-1 text-xl leading-tight font-medium md:text-2xl">{job.title}</h3>
      <p className="font-light text-fg-muted">
        {WORKPLACE_LABELS[job.workplace]} · {formatPlace(job.city, job.country)}
      </p>
      <p className="mt-1 text-lg font-medium tracking-wide">
        {formatSalary(job.salaryMin, job.salaryMax)}
      </p>
      {reasons && reasons.length > 0 && (
        <ul className="mt-1 flex flex-wrap gap-1.5">
          {reasons.map((r) => (
            <li key={r} className="rounded-full bg-chip/30 px-2 py-0.5 text-xs text-fg-muted">
              {r}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-1 flex items-center justify-between">
        {employerView ? (
          <span className="flex items-center gap-2 text-sm">
            <StatusBadge status={job.status} />
            <span className="text-fg-subtle">
              {job.applicants} {job.applicants === 1 ? "applicant" : "applicants"}
            </span>
          </span>
        ) : (
          <span className="flex items-center gap-1 font-light text-success">
            <Image
              src="/icons/easy-apply.png"
              alt=""
              width={18}
              height={18}
              className="size-[18px]"
            />
            Easy Apply
          </span>
        )}
        <time dateTime={job.createdAt} className="text-sm text-fg-subtle">
          {timeAgo(job.createdAt)}
        </time>
      </div>
    </article>
  );
}

const STATUS_STYLES: Record<JobStatus, string> = {
  OPEN: "bg-success/20 text-fg",
  DRAFT: "bg-surface-muted text-fg-muted",
  CLOSED: "bg-heading-accent/15 text-heading-accent",
};

export function StatusBadge({ status }: { status: JobStatus }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 text-xs font-medium tracking-label uppercase",
        STATUS_STYLES[status],
      )}
    >
      {status.toLowerCase()}
    </span>
  );
}
