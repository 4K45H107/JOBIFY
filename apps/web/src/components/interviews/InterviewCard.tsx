"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Interview } from "@jobify/shared";
import { CompanyLogo } from "@/components/company/CompanyLogo";
import { cn } from "@/lib/cn";
import { formatWhen, untilLabel } from "@/lib/time";

/** Figma "Interviews": role, round, countdown ("2 hrs Remaining"), Details and Join. */
export function InterviewCard({
  interview: i,
  roomHref,
  viewer,
  actions,
}: {
  interview: Interview;
  roomHref: string;
  viewer: "SEEKER" | "EMPLOYER";
  actions?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState(() => untilLabel(i.scheduledAt, i.endsAt));
  useEffect(() => {
    const timer = setInterval(() => setLabel(untilLabel(i.scheduledAt, i.endsAt)), 30_000);
    return () => clearInterval(timer);
  }, [i.scheduledAt, i.endsAt]);

  const over = i.status === "COMPLETED" || i.status === "CANCELLED";
  return (
    <li className="rounded-[10px] border border-border p-4">
      <div className="flex flex-wrap items-center gap-4">
        <CompanyLogo
          name={i.company.name}
          src={i.company.logoUrl}
          className="size-12 shrink-0 text-base"
        />
        <div className="min-w-0 flex-1">
          <p className="text-xl font-medium">{i.job.title}</p>
          <p className="text-fg-muted">
            {i.stage} · {viewer === "SEEKER" ? i.company.name : i.seeker.fullName}
          </p>
          <p className="text-sm text-fg-subtle">
            {formatWhen(i.scheduledAt)} · {i.durationMin} min
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={cn(
              "rounded-full px-3 py-1 text-sm",
              over
                ? "bg-surface-muted text-fg-subtle"
                : i.canJoin
                  ? "bg-success/30 font-medium"
                  : "bg-chip/30",
            )}
          >
            {i.status === "CANCELLED"
              ? "Cancelled"
              : i.status === "COMPLETED"
                ? "Completed"
                : label}
          </span>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="text-sm text-link hover:underline"
          >
            Details
          </button>
          {i.canJoin ? (
            <Link
              href={roomHref}
              className="inline-flex h-10 items-center rounded-full bg-primary px-6 font-medium tracking-label text-primary-fg uppercase"
            >
              Join
            </Link>
          ) : (
            !over && (
              <span
                className="inline-flex h-10 items-center rounded-full bg-surface-muted px-6 text-sm tracking-label text-fg-subtle uppercase"
                title="The room opens 10 minutes before the start"
              >
                Join
              </span>
            )
          )}
        </div>
      </div>
      {open && (
        <dl className="mt-3 grid gap-3 rounded-[10px] bg-surface-grey p-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-fg-subtle">Candidate</dt>
            <dd>{i.seeker.fullName}</dd>
          </div>
          <div>
            <dt className="text-fg-subtle">Interviewer</dt>
            <dd>{i.interviewer.fullName}</dd>
          </div>
          <div>
            <dt className="text-fg-subtle">Room</dt>
            <dd>Opens 10 minutes before the start</dd>
          </div>
        </dl>
      )}
      {actions && (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">{actions}</div>
      )}
    </li>
  );
}
