"use client";

import Link from "next/link";
import { useState } from "react";
import { type MyApplication, type MyApplications, WITHDRAWABLE } from "@jobify/shared";
import { CompanyLogo } from "@/components/company/CompanyLogo";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api/client";
import { formatPlace, formatSalary, timeAgo } from "@/lib/format";
import { STAGE_LABELS, StageBadge } from "./StageBadge";

/** Figma "Activities - Applications": total on the right, groups by status. */
const GROUPS: { title: string; stages: MyApplication["stage"][] }[] = [
  { title: "Status - Ongoing", stages: ["APPLIED", "TESTING", "SHORTLISTED"] },
  { title: "Status - Selected for interviews", stages: ["INTERVIEW", "OFFER"] },
  { title: "Status - Rejected", stages: ["REJECTED", "WITHDRAWN"] },
];

export function MyApplicationsView({ initial }: { initial: MyApplications }) {
  const [items, setItems] = useState(initial.items);
  const replace = (next: MyApplication) =>
    setItems((list) => list.map((a) => (a.id === next.id ? next : a)));

  if (items.length === 0) {
    return (
      <p className="rounded-[10px] bg-surface-grey p-8 text-center text-fg-subtle">
        No applications yet.{" "}
        <Link href="/explore/jobs" className="text-link underline">
          Find a job
        </Link>{" "}
        and use Easy Apply.
      </p>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_240px]">
      <div className="flex flex-col gap-8">
        {GROUPS.map((group) => {
          const list = items.filter((a) => group.stages.includes(a.stage));
          return (
            <section key={group.title} aria-label={group.title}>
              <h2 className="mb-2 text-xl tracking-label">
                {group.title} <span className="text-fg-subtle">({list.length})</span>
              </h2>
              {list.length === 0 ? (
                <p className="text-sm text-fg-subtle">None.</p>
              ) : (
                <ul className="flex flex-col">
                  {list.map((a) => (
                    <ApplicationRow key={a.id} application={a} onChange={replace} />
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
      <aside className="order-first flex flex-col gap-2 lg:order-last">
        <div className="flex items-center justify-between rounded-[10px] bg-primary px-4 py-3 text-primary-fg">
          <span className="tracking-label">Total applications</span>
          <span className="rounded-full bg-primary-fg px-3 py-0.5 font-medium text-primary">
            {items.length}
          </span>
        </div>
        {(["INTERVIEW", "REJECTED", "TESTING"] as const).map((stage) => (
          <div
            key={stage}
            className="flex items-center justify-between rounded-[10px] bg-primary/90 px-4 py-2 text-sm text-primary-fg"
          >
            <span className="tracking-label">{STAGE_LABELS[stage]}</span>
            <span className="rounded-full bg-primary-fg px-3 py-0.5 text-primary">
              {items.filter((a) => a.stage === stage).length}
            </span>
          </div>
        ))}
      </aside>
    </div>
  );
}

function ApplicationRow({
  application: a,
  onChange,
}: {
  application: MyApplication;
  onChange: (a: MyApplication) => void;
}) {
  const [busy, setBusy] = useState(false);
  const withdraw = async () => {
    if (!confirm(`Withdraw your application to ${a.job.company.name}?`)) return;
    setBusy(true);
    try {
      onChange(await api<MyApplication>(`/me/applications/${a.id}`, { method: "DELETE" }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="flex flex-col gap-2 border-b border-fg/60 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <CompanyLogo
          name={a.job.company.name}
          src={a.job.company.logoUrl}
          className="size-10 shrink-0 text-sm"
        />
        <div className="min-w-0">
          <Link href={`/jobs/${a.job.id}`} className="text-lg font-medium hover:underline">
            {a.job.title}
          </Link>
          <p className="text-sm text-fg-muted">
            {a.job.company.name} · {formatPlace(a.job.city, a.job.country)} ·{" "}
            {formatSalary(a.job.salaryMin, a.job.salaryMax)}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm">
            <StageBadge stage={a.stage} />
            <span className="text-fg-subtle">Applied {timeAgo(a.appliedAt)} ago</span>
            {a.test.state === "SUBMITTED" && (
              <span className="text-fg-subtle">· Test score {a.test.score}%</span>
            )}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        {a.stage === "TESTING" && a.test.state !== "SUBMITTED" && (
          <Link
            href={`/applications/${a.id}/test`}
            className="inline-flex h-9 items-center rounded-full bg-primary px-5 text-sm font-medium tracking-label text-primary-fg uppercase"
          >
            {a.test.state === "IN_PROGRESS" ? "Resume test" : "Take test"}
          </Link>
        )}
        {WITHDRAWABLE.includes(a.stage) && (
          <Button size="sm" variant="ghost" onClick={withdraw} disabled={busy}>
            Withdraw
          </Button>
        )}
      </div>
    </li>
  );
}
