"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { COMPANY_SIZE_LABELS, type CompanyList } from "@jobify/shared";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { TextField } from "@/components/ui/TextField";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { cn } from "@/lib/cn";
import { CompanyForm } from "./CompanyForm";
import { CompanyLogo } from "./CompanyLogo";

export function Onboarding({ pending }: { pending: { name: string } | null }) {
  const router = useRouter();
  const [mode, setMode] = useState<"join" | "create">("join");
  const done = () => router.refresh();

  if (pending) return <PendingRequest companyName={pending.name} onWithdrawn={done} />;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header className="text-center">
        <h1 className="text-3xl font-medium">Set up your company</h1>
        <p className="mt-2 text-fg-subtle">
          Join your team on Jobify, or add your company if it isn&apos;t here yet.
        </p>
      </header>

      <div role="tablist" className="mx-auto flex w-full max-w-md border-b border-fg">
        {(
          [
            ["join", "Join a company"],
            ["create", "Create a company"],
          ] as const
        ).map(([id, label], i) => (
          <button
            key={id}
            role="tab"
            aria-selected={mode === id}
            onClick={() => setMode(id)}
            className={cn(
              "flex-1 py-3 text-lg tracking-label",
              mode === id && "bg-surface-muted",
              i > 0 && "border-l border-fg",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "join" ? (
        <JoinCompany onRequested={done} />
      ) : (
        <Card>
          <CardHeader
            title="Create a company"
            description="You'll be its admin and can approve teammates who ask to join."
          />
          <CompanyForm
            submitLabel="Create company"
            // Full load: the whole employer layout (navigation, home link) changes with the membership.
            onSaved={() => window.location.assign("/employer/company")}
          />
        </Card>
      )}
    </div>
  );
}

function JoinCompany({ onRequested }: { onRequested: () => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<CompanyList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requesting, setRequesting] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      api<CompanyList>(`/companies?pageSize=8&q=${encodeURIComponent(q)}`)
        .then(setResults)
        .catch(() => setError("Couldn't load companies."));
    }, 250);
    return () => clearTimeout(timer);
  }, [q]);

  const request = async (id: string) => {
    setError(null);
    setRequesting(id);
    try {
      await api(`/companies/${id}/join-requests`, { method: "POST" });
      onRequested();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't send the request.");
      setRequesting(null);
    }
  };

  return (
    <Card>
      <CardHeader
        title="Find your company"
        description="The company's admin approves new members."
      />
      <TextField
        label="Search companies"
        placeholder="Company name, industry or city"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {error && <Alert className="mt-4">{error}</Alert>}
      <ul className="mt-4 divide-y divide-border">
        {results?.items.map((c) => (
          <li key={c.id} className="flex items-center gap-4 py-3">
            <CompanyLogo name={c.name} src={c.logoUrl} className="size-12 text-lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{c.name}</p>
              <p className="truncate text-sm text-fg-subtle">
                {[c.industry, c.headquarters, c.size && COMPANY_SIZE_LABELS[c.size]]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={requesting !== null}
              onClick={() => request(c.id)}
            >
              {requesting === c.id ? "Sending…" : "Ask to join"}
            </Button>
          </li>
        ))}
        {results && results.items.length === 0 && (
          <li className="py-6 text-center text-fg-subtle">
            No companies match. You can create it instead.
          </li>
        )}
      </ul>
    </Card>
  );
}

function PendingRequest({
  companyName,
  onWithdrawn,
}: {
  companyName: string;
  onWithdrawn: () => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Card className="mx-auto max-w-xl text-center">
      <h1 className="text-2xl font-medium">Waiting for approval</h1>
      <p className="mt-3 text-fg-subtle">
        You asked to join <span className="font-medium text-fg">{companyName}</span>. You&apos;ll
        get access as soon as its admin approves the request.
      </p>
      <Button
        variant="outline"
        className="mt-6"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await api("/companies/join-requests/mine", { method: "DELETE" });
          onWithdrawn();
        }}
      >
        {busy ? "Withdrawing…" : "Withdraw request"}
      </Button>
    </Card>
  );
}
