"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  type Applicant,
  type ApplicantSort,
  type ApplicationStage,
  STAGE_TRANSITIONS,
} from "@jobify/shared";
import { STAGE_LABELS, StageBadge } from "@/components/activities/StageBadge";
import { ScheduleDialog } from "@/components/interviews/ScheduleDialog";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { cn } from "@/lib/cn";
import { formatDate, timeAgo } from "@/lib/format";
import { EMPLOYMENT_LABELS } from "@/lib/labels";

const ACTION_LABELS: Partial<Record<ApplicationStage, string>> = {
  SHORTLISTED: "Shortlist",
  OFFER: "Make offer",
  REJECTED: "Reject",
};

const SORTS: { id: ApplicantSort; label: string }[] = [
  { id: "score", label: "Marks" },
  { id: "date", label: "Date of application" },
  { id: "experience", label: "Experience" },
];

/** Figma "Job Management": applicants list with View CV and test score, Sort By on the right. */
export function ApplicantsBoard({
  jobId,
  jobTitle,
  applicants: initial,
  sort,
  stage,
  hasTest,
}: {
  jobId: string;
  jobTitle: string;
  applicants: Applicant[];
  sort: ApplicantSort;
  stage: ApplicationStage | null;
  hasTest: boolean;
}) {
  const [applicants, setApplicants] = useState(initial);
  const [cvFor, setCvFor] = useState<Applicant | null>(null);
  const href = (next: { sort?: string; stage?: string | null }) => {
    const params = new URLSearchParams();
    const s = next.sort ?? sort;
    const st = next.stage === undefined ? stage : next.stage;
    if (s !== "date") params.set("sort", s);
    if (st) params.set("stage", st);
    const q = params.toString();
    return `/employer/jobs/${jobId}/applicants${q ? `?${q}` : ""}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-baseline gap-x-4">
        <span className="text-xl">Job title:</span>
        <Link href={`/employer/jobs/${jobId}`} className="text-2xl font-medium hover:underline">
          {jobTitle}
        </Link>
      </header>

      <nav aria-label="Filter by stage" className="flex flex-wrap gap-2">
        {(
          [null, "APPLIED", "TESTING", "SHORTLISTED", "INTERVIEW", "OFFER", "REJECTED"] as const
        ).map((s) => (
          <Link
            key={s ?? "all"}
            href={href({ stage: s })}
            aria-current={s === stage ? "page" : undefined}
            className={cn(
              "rounded-full border px-3 py-1 text-sm",
              s === stage ? "border-outline bg-chip" : "border-border hover:bg-surface-grey",
            )}
          >
            {s ? STAGE_LABELS[s] : "All"}
          </Link>
        ))}
      </nav>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_220px]">
        <section aria-labelledby="applicants-title">
          <h2 id="applicants-title" className="mb-2 text-xl">
            Applicants list <span className="text-fg-subtle">({applicants.length})</span>
          </h2>
          {applicants.length === 0 ? (
            <p className="rounded-[10px] bg-surface-grey p-8 text-center text-fg-subtle">
              No applicants here yet.
            </p>
          ) : (
            <ul className="flex flex-col">
              {applicants.map((a) => (
                <ApplicantRow
                  key={a.id}
                  applicant={a}
                  hasTest={hasTest}
                  onViewCv={() => setCvFor(a)}
                  onChange={(next) =>
                    setApplicants((list) => list.map((x) => (x.id === next.id ? next : x)))
                  }
                />
              ))}
            </ul>
          )}
        </section>
        <aside className="order-first xl:order-last">
          <div className="rounded-[10px] border border-border p-4">
            <h2 className="mb-3 font-medium tracking-label">Sort by</h2>
            <ul className="flex flex-col gap-1">
              {SORTS.map((s) => (
                <li key={s.id}>
                  <Link
                    href={href({ sort: s.id })}
                    aria-current={s.id === sort ? "true" : undefined}
                    className={cn(
                      "block rounded-[8px] px-3 py-1.5",
                      s.id === sort ? "bg-primary text-primary-fg" : "hover:bg-surface-grey",
                    )}
                  >
                    {s.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      {cvFor && <CvViewer applicant={cvFor} onClose={() => setCvFor(null)} />}
    </div>
  );
}

function ApplicantRow({
  applicant: a,
  hasTest,
  onViewCv,
  onChange,
}: {
  applicant: Applicant;
  hasTest: boolean;
  onViewCv: () => void;
  onChange: (a: Applicant) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<ApplicationStage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scheduling, setScheduling] = useState(false);
  const [scheduled, setScheduled] = useState<string | null>(null);

  const move = async (to: ApplicationStage) => {
    if (to === "REJECTED" && !confirm(`Reject ${a.seeker.fullName}? They'll be notified.`)) return;
    setBusy(to);
    setError(null);
    try {
      const updated = await api<Applicant>(`/applications/${a.id}/stage`, {
        method: "PATCH",
        json: { stage: to },
      });
      onChange(updated);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't update the applicant.");
    } finally {
      setBusy(null);
    }
  };

  const working =
    a.seeker.currentPosition ??
    (a.seeker.employmentStatus
      ? EMPLOYMENT_LABELS[a.seeker.employmentStatus as keyof typeof EMPLOYMENT_LABELS]
      : null);

  return (
    <li className="border-b border-fg/60 py-4">
      <div className="flex flex-wrap items-start gap-4">
        <Avatar src={a.seeker.photoUrl} alt="" className="size-12 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-lg font-medium">{a.seeker.fullName}</p>
            <StageBadge stage={a.stage} />
          </div>
          <p className="text-fg-muted">
            Currently working as: <span className="text-fg">{working ?? "—"}</span>
          </p>
          <p className="text-sm text-fg-muted">
            {a.seeker.experienceYears !== null && `${a.seeker.experienceYears} yrs experience · `}
            {a.seeker.location && `${a.seeker.location} · `}
            Applied {timeAgo(a.appliedAt)} ago ({formatDate(a.appliedAt)})
          </p>
          {hasTest && (
            <p className="mt-1 text-sm">
              {a.test.state === "SUBMITTED" ? (
                <span className="font-medium">Got {a.test.score}% on skill test</span>
              ) : (
                <span className="text-fg-subtle">
                  {a.test.state === "IN_PROGRESS"
                    ? "Taking the skill test"
                    : "Skill test not taken yet"}
                </span>
              )}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={onViewCv}>
            View CV
          </Button>
          {(a.stage === "SHORTLISTED" || a.stage === "INTERVIEW") && (
            <Button size="sm" onClick={() => setScheduling(true)}>
              {a.stage === "INTERVIEW" ? "Schedule another" : "Schedule interview"}
            </Button>
          )}
          {/* Moving to INTERVIEW happens by scheduling one, so it isn't a separate button. */}
          {STAGE_TRANSITIONS[a.stage]
            .filter((to) => to !== "INTERVIEW")
            .map((to) => (
              <Button
                key={to}
                size="sm"
                variant={to === "REJECTED" ? "ghost" : "primary"}
                disabled={busy !== null}
                onClick={() => move(to)}
              >
                {busy === to ? "…" : (ACTION_LABELS[to] ?? STAGE_LABELS[to])}
              </Button>
            ))}
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-heading-accent">{error}</p>}
      {scheduled && <p className="mt-2 text-sm text-success">{scheduled}</p>}
      {scheduling && (
        <ScheduleDialog
          title={`Schedule interview · ${a.seeker.fullName}`}
          applicationId={a.id}
          onClose={() => setScheduling(false)}
          onDone={(interview) => {
            setScheduling(false);
            setScheduled(
              `${interview.stage} scheduled for ${new Date(interview.scheduledAt).toLocaleString()}.`,
            );
            onChange({ ...a, stage: "INTERVIEW" });
            router.refresh();
          }}
        />
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-2 text-sm text-link hover:underline"
        aria-expanded={open}
      >
        {open ? "Hide details" : "Show answers, contact and history"}
      </button>
      {open && (
        <div className="mt-3 grid gap-4 rounded-[10px] bg-surface-grey p-4 text-sm md:grid-cols-3">
          <section>
            <h3 className="mb-1 font-semibold">Contact</h3>
            <p>{a.contact.fullName}</p>
            <a href={`mailto:${a.contact.email}`} className="text-link underline">
              {a.contact.email}
            </a>
            <p>{a.contact.phone}</p>
            {a.seeker.skills.length > 0 && (
              <p className="mt-2 text-fg-muted">Skills: {a.seeker.skills.join(", ")}</p>
            )}
          </section>
          <section>
            <h3 className="mb-1 font-semibold">Screening answers</h3>
            {a.answers.length === 0 ? (
              <p className="text-fg-subtle">None.</p>
            ) : (
              <dl className="flex flex-col gap-1">
                {a.answers.map((ans) => (
                  <div key={ans.questionId}>
                    <dt className="text-fg-muted">{ans.prompt}</dt>
                    <dd className="font-medium capitalize">{ans.answer}</dd>
                  </div>
                ))}
              </dl>
            )}
          </section>
          <section>
            <h3 className="mb-1 font-semibold">History</h3>
            <ol className="flex flex-col gap-1">
              {a.history.map((h, i) => (
                <li key={i}>
                  {STAGE_LABELS[h.to]} <span className="text-fg-subtle">· {formatDate(h.at)}</span>
                  {h.note && <span className="block text-fg-muted">“{h.note}”</span>}
                </li>
              ))}
            </ol>
          </section>
        </div>
      )}
    </li>
  );
}

function CvViewer({ applicant, onClose }: { applicant: Applicant; onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${applicant.seeker.fullName}'s CV`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="flex h-[90dvh] w-full max-w-4xl flex-col overflow-hidden rounded-[10px] bg-bg"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="font-medium">{applicant.seeker.fullName} · CV</p>
          <div className="flex gap-2">
            <a
              href={applicant.cvUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-[10px] border border-outline px-3 py-1 text-sm"
            >
              Open in new tab
            </a>
            <Button size="sm" variant="ghost" onClick={onClose} autoFocus>
              Close
            </Button>
          </div>
        </header>
        <iframe title="CV" src={applicant.cvUrl} className="flex-1 bg-surface-grey" />
      </div>
    </div>
  );
}
