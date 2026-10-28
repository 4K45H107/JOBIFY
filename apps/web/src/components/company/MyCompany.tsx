"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  type Branch,
  type CompanyDetail,
  type CompanyMember,
  COMPANY_SIZE_LABELS,
  UPLOAD_LIMITS,
} from "@jobify/shared";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { FileButton } from "@/components/ui/FileButton";
import { TextField } from "@/components/ui/TextField";
import { api } from "@/lib/api/client";
import { CompanyForm } from "./CompanyForm";
import { CompanyLogo } from "./CompanyLogo";

/** Figma "Company Profile employer": cover, logo, stats row, overview card. Admins can edit and manage members. */
export function MyCompany({
  initial,
  isAdmin,
  initialMembers,
}: {
  initial: CompanyDetail;
  isAdmin: boolean;
  initialMembers: CompanyMember[];
}) {
  const router = useRouter();
  const [company, setCompany] = useState(initial);
  const [editing, setEditing] = useState(false);
  const saved = (next: CompanyDetail) => {
    setCompany(next);
    router.refresh();
  };

  const stats: [string, number][] = [
    ["Employees", company.employees],
    ["Open jobs", company.openJobs],
    ["Branches", company.branches.length],
  ];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <section className="relative">
        <div className="relative h-40 overflow-hidden rounded-[10px] bg-surface-muted md:h-64">
          {company.coverUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={company.coverUrl} alt="" className="size-full object-cover" />
          )}
          {isAdmin && (
            <CameraUpload
              endpoint="/companies/mine/cover"
              onUploaded={saved}
              label="Change cover"
              className="right-3 bottom-3"
            />
          )}
        </div>
        <div className="-mt-12 flex flex-col items-start gap-2 px-4 md:-mt-16 md:flex-row md:items-end md:gap-4 md:px-8">
          <div className="relative">
            <CompanyLogo
              name={company.name}
              src={company.logoUrl}
              className="size-24 border border-border text-3xl shadow-sm md:size-36 md:rounded-[20px] md:text-5xl"
            />
            {isAdmin && (
              <CameraUpload
                endpoint="/companies/mine/logo"
                onUploaded={saved}
                label="Change logo"
                className="-right-2 -bottom-2"
              />
            )}
          </div>
          <h1 className="text-2xl font-semibold tracking-label break-words uppercase md:pb-2 md:text-3xl">
            {company.name}
          </h1>
        </div>
      </section>

      <nav
        aria-label="Company stats"
        className="grid grid-cols-4 divide-x divide-fg md:flex md:px-2"
      >
        <span className="self-center text-lg md:pr-6 md:text-xl">Overview</span>
        {stats.map(([label, value]) => (
          <span key={label} className="px-2 text-center md:px-6">
            <span className="block text-xl font-medium">{value}</span>
            <span className="block text-xs text-success">{label}</span>
          </span>
        ))}
      </nav>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card>
          {editing ? (
            <>
              <CardHeader title="Edit company" />
              <CompanyForm
                company={company}
                submitLabel="Save"
                onCancel={() => setEditing(false)}
                onSaved={(next) => {
                  saved(next);
                  setEditing(false);
                }}
              />
            </>
          ) : (
            <>
              <CardHeader
                title={`${company.name} overview`}
                action={
                  isAdmin && (
                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      aria-label="Edit company"
                      className="rounded-[8px] p-1 hover:bg-surface-grey"
                    >
                      <Image
                        src="/icons/edit.png"
                        alt=""
                        width={28}
                        height={28}
                        className="icon-themed"
                      />
                    </button>
                  )
                }
              />
              {company.website && (
                <a
                  href={company.website}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-success underline"
                >
                  {company.website.replace(/^https?:\/\//, "")}
                </a>
              )}
              <ul className="mt-3 list-disc pl-5 text-sm text-fg-muted">
                {company.size && <li>{COMPANY_SIZE_LABELS[company.size]}</li>}
                {company.industry && <li>Industry: {company.industry}</li>}
                {company.foundedYear && <li>Founded in {company.foundedYear}</li>}
                {company.headquarters && <li>Headquarters: {company.headquarters}</li>}
              </ul>
              <p className="mt-4 whitespace-pre-line text-fg-muted">
                {company.description ?? (
                  <span className="italic text-fg-subtle">No overview yet.</span>
                )}
              </p>
              {company.mission && (
                <p className="mt-4 text-sm">
                  <span className="font-semibold">Mission:</span> {company.mission}
                </p>
              )}
            </>
          )}
        </Card>

        <BranchesCard
          branches={company.branches}
          isAdmin={isAdmin}
          onChange={(branches) => setCompany((c) => ({ ...c, branches }))}
        />
      </div>

      {isAdmin && <MembersCard initial={initialMembers} onChange={() => router.refresh()} />}
    </div>
  );
}

function CameraUpload({
  endpoint,
  onUploaded,
  label,
  className,
}: {
  endpoint: string;
  onUploaded: (c: CompanyDetail) => void;
  label: string;
  className: string;
}) {
  return (
    <div className={`absolute ${className}`}>
      <FileButton
        endpoint={endpoint}
        accept={UPLOAD_LIMITS.image.types}
        maxBytes={UPLOAD_LIMITS.image.maxBytes}
        onUploaded={onUploaded}
        variant="ghost"
        caps={false}
        aria-label={label}
        className="size-10 rounded-full bg-chip/80 p-0 hover:bg-chip"
      >
        <Image src="/icons/camera.png" alt="" width={26} height={26} />
      </FileButton>
    </div>
  );
}

function BranchesCard({
  branches,
  isAdmin,
  onChange,
}: {
  branches: Branch[];
  isAdmin: boolean;
  onChange: (branches: Branch[]) => void;
}) {
  const [draft, setDraft] = useState({ name: "", city: "", country: "" });
  const [busy, setBusy] = useState(false);
  const valid =
    draft.name.trim().length >= 2 && draft.city.trim() && draft.country.trim().length >= 2;

  const add = async () => {
    setBusy(true);
    try {
      const branch = await api<Branch>("/companies/mine/branches", { method: "POST", json: draft });
      onChange([...branches, branch]);
      setDraft({ name: "", city: "", country: "" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader title="Offices" />
      {branches.length === 0 ? (
        <p className="text-fg-subtle">No offices listed yet.</p>
      ) : (
        <ul className="divide-y divide-border">
          {branches.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-3 py-2">
              <span>
                <span className="font-medium">{b.name}</span>
                <span className="block text-sm text-fg-subtle">
                  {b.city}, {b.country}
                </span>
              </span>
              {isAdmin && (
                <button
                  type="button"
                  aria-label={`Remove ${b.name}`}
                  className="rounded px-2 text-fg-subtle hover:text-heading-accent"
                  onClick={async () => {
                    await api(`/companies/mine/branches/${b.id}`, { method: "DELETE" });
                    onChange(branches.filter((x) => x.id !== b.id));
                  }}
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {isAdmin && (
        <div className="mt-4 grid gap-3">
          <TextField
            label="Office name"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="City"
              value={draft.city}
              onChange={(e) => setDraft({ ...draft, city: e.target.value })}
            />
            <TextField
              label="Country"
              value={draft.country}
              onChange={(e) => setDraft({ ...draft, country: e.target.value })}
            />
          </div>
          <Button size="sm" variant="outline" disabled={!valid || busy} onClick={add}>
            Add office
          </Button>
        </div>
      )}
    </Card>
  );
}

function MembersCard({ initial, onChange }: { initial: CompanyMember[]; onChange: () => void }) {
  const [members, setMembers] = useState(initial);
  const pending = members.filter((m) => m.status === "PENDING");
  const active = members.filter((m) => m.status === "ACTIVE");

  const decide = async (userId: string, decision: "approve" | "reject") => {
    await api(`/companies/mine/members/${userId}/${decision}`, { method: "POST" });
    setMembers((list) =>
      list.map((m) =>
        m.userId === userId ? { ...m, status: decision === "approve" ? "ACTIVE" : "REJECTED" } : m,
      ),
    );
    onChange();
  };

  return (
    <Card>
      <CardHeader
        title="Team"
        description="People who can post jobs and review applicants for this company."
      />
      {pending.length > 0 && (
        <section aria-label="Join requests" className="mb-6 rounded-[10px] bg-surface-grey p-4">
          <h3 className="mb-3 font-medium">Join requests ({pending.length})</h3>
          <ul className="flex flex-col gap-3">
            {pending.map((m) => (
              <li key={m.userId} className="flex flex-wrap items-center gap-3">
                <Avatar src={m.photoUrl} alt="" className="size-10" />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{m.fullName}</span>
                  <span className="block text-sm text-fg-subtle">
                    {m.designation ?? m.email} wants to join
                  </span>
                </span>
                <Button size="sm" onClick={() => decide(m.userId, "approve")}>
                  Approve
                </Button>
                <Button size="sm" variant="outline" onClick={() => decide(m.userId, "reject")}>
                  Reject
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {active.map((m) => (
          <li key={m.userId} className="flex items-center gap-3">
            <Avatar src={m.photoUrl} alt="" className="size-10" />
            <span className="min-w-0">
              <span className="block truncate font-medium">{m.fullName}</span>
              <span className="block truncate text-sm text-fg-subtle">
                {m.role === "ADMIN" ? "Admin" : (m.designation ?? "Recruiter")}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
