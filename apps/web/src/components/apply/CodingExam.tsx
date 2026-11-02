"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  type Attempt,
  CODING_LANGUAGE_LABELS,
  CODING_STARTER_CODE,
  CodingLanguage,
} from "@jobify/shared";
import { CodeEditor } from "@/components/coding/CodeEditor";
import { ProblemStatement } from "@/components/coding/ProblemStatement";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { cn } from "@/lib/cn";

const remaining = (deadline: string) =>
  Math.max(0, Math.floor((Date.parse(deadline) - Date.now()) / 1000));
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const AUTOSAVE_MS = 1500;

type SaveState = "idle" | "saving" | "saved" | "failed";

/**
 * A coding test: the problem beside a code editor. Work is autosaved, so a reload resumes it and
 * the time running out submits the last saved code. Nothing runs yet; the hiring team reads it.
 */
export function CodingExam({
  applicationId,
  jobTitle,
  initial,
}: {
  applicationId: string;
  jobTitle: string;
  initial: Attempt | null;
}) {
  const [attempt, setAttempt] = useState<Attempt | null>(initial);
  const [language, setLanguage] = useState<CodingLanguage>(initial?.code?.language ?? "python");
  const [code, setCode] = useState(
    initial?.code?.code || CODING_STARTER_CODE[initial?.code?.language ?? "python"],
  );
  const [left, setLeft] = useState(initial ? remaining(initial.deadline) : 0);
  const [save, setSave] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submitted = useRef(false);
  const dirty = useRef(false);

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      const a = await api<Attempt>(`/me/applications/${applicationId}/attempt`, { method: "POST" });
      setAttempt(a);
      setLeft(remaining(a.deadline));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't start the test.");
    } finally {
      setBusy(false);
    }
  };

  // Autosave a moment after the last keystroke or language change.
  useEffect(() => {
    if (!attempt || attempt.submittedAt || !dirty.current) return;
    const timer = setTimeout(async () => {
      setSave("saving");
      try {
        await api(`/attempts/${attempt.id}/draft`, { method: "PUT", json: { language, code } });
        setSave("saved");
      } catch {
        setSave("failed");
      }
    }, AUTOSAVE_MS);
    return () => clearTimeout(timer);
  }, [attempt, language, code]);

  const edit = (next: string) => {
    dirty.current = true;
    setCode(next);
  };

  const switchLanguage = (next: CodingLanguage) => {
    dirty.current = true;
    // Untouched starter code follows the language; real work is kept.
    if (!code.trim() || code === CODING_STARTER_CODE[language]) setCode(CODING_STARTER_CODE[next]);
    setLanguage(next);
  };

  const submit = useCallback(
    async (timedOut = false) => {
      if (!attempt || submitted.current) return;
      if (!timedOut && !confirm("Submit your solution? You can't change it afterwards.")) return;
      submitted.current = true;
      setBusy(true);
      setError(null);
      try {
        setAttempt(
          await api<Attempt>(`/attempts/${attempt.id}/submit`, {
            method: "POST",
            json: { language, code },
          }),
        );
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Couldn't submit. Please try again.");
        if (e instanceof ApiError && e.status === 409) {
          // Too late or already in: show what was recorded.
          setAttempt(
            await api<Attempt>(`/me/applications/${applicationId}/attempt`, { method: "POST" }),
          );
        } else {
          submitted.current = false;
        }
      } finally {
        setBusy(false);
      }
    },
    [applicationId, attempt, code, language],
  );

  // Countdown; submits the current code when time runs out.
  useEffect(() => {
    if (!attempt || attempt.submittedAt) return;
    const timer = setInterval(() => {
      const s = remaining(attempt.deadline);
      setLeft(s);
      if (s === 0) {
        clearInterval(timer);
        void submit(true);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [attempt, submit]);

  if (!attempt) {
    return (
      <Card className="mx-auto max-w-xl text-center">
        <h1 className="text-2xl font-semibold tracking-label uppercase">Coding test</h1>
        <p className="mt-2 text-fg-muted">Skill test for {jobTitle}</p>
        <ul className="mx-auto mt-4 max-w-sm list-disc text-left text-sm text-fg-muted">
          <li>You&apos;ll get one programming problem. The clock starts when you press Start.</li>
          <li>
            Write your solution in Python, JavaScript, C++ or Java. It reads standard input and
            prints the answer.
          </li>
          <li>
            Your code is saved as you type. When time runs out, the last saved version is submitted.
          </li>
        </ul>
        {error && <Alert className="mt-4">{error}</Alert>}
        <Button className="mt-6" onClick={start} disabled={busy}>
          {busy ? "Starting…" : "Start test"}
        </Button>
      </Card>
    );
  }

  if (attempt.submittedAt) {
    return (
      <Card className="mx-auto flex max-w-3xl flex-col gap-4">
        <div className="text-center">
          <h1 className="text-2xl font-medium">Solution submitted</h1>
          <p className="mt-2 text-fg-muted">
            The hiring team will review your code alongside your application.
          </p>
        </div>
        {error && <Alert>{error}</Alert>}
        {attempt.code?.code ? (
          <>
            <p className="text-sm text-fg-subtle">
              {attempt.problem?.title} · {CODING_LANGUAGE_LABELS[attempt.code.language]}
            </p>
            <CodeEditor
              readOnly
              label="Your submitted code"
              language={attempt.code.language}
              value={attempt.code.code}
              className="h-80"
            />
          </>
        ) : (
          <p className="text-center text-fg-subtle">Time ran out before any code was saved.</p>
        )}
        <Link href="/activities?tab=applications" className="self-center text-link underline">
          Back to my applications
        </Link>
      </Card>
    );
  }

  const urgent = left <= 60;
  return (
    <div className="flex flex-col gap-4 lg:h-full">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-fg-muted">
          Coding test · <span className="text-fg">{attempt.title}</span>
        </p>
        <p
          role="timer"
          aria-live={urgent ? "polite" : "off"}
          className={cn(
            "rounded-full px-3 py-1 font-mono text-lg tabular-nums",
            urgent ? "bg-heading-accent/15 text-heading-accent" : "bg-surface-grey",
          )}
        >
          <span className="sr-only">Time left: </span>
          {mmss(left)}
        </p>
      </header>
      {error && <Alert>{error}</Alert>}
      <div className="grid gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* Focusable so keyboard users can scroll a long statement. */}
        <section
          aria-label="Problem"
          tabIndex={0}
          className="rounded-[10px] border border-border p-5 lg:min-h-0 lg:overflow-y-auto"
        >
          {attempt.problem && <ProblemStatement problem={attempt.problem} headingLevel={1} />}
        </section>
        <section aria-label="Your solution" className="flex min-h-[420px] flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm">
              <span className="font-medium">Language</span>
              <select
                value={language}
                onChange={(e) => switchLanguage(CodingLanguage.parse(e.target.value))}
                className="h-9 rounded-[8px] border border-border bg-bg px-2"
              >
                {CodingLanguage.options.map((l) => (
                  <option key={l} value={l}>
                    {CODING_LANGUAGE_LABELS[l]}
                  </option>
                ))}
              </select>
            </label>
            <p className="text-sm text-fg-subtle" role="status">
              {save === "saving"
                ? "Saving…"
                : save === "saved"
                  ? "All changes saved"
                  : save === "failed"
                    ? "Couldn't save. Keep this tab open and try again."
                    : ""}
            </p>
          </div>
          <CodeEditor
            label="Code editor"
            language={language}
            value={code}
            onChange={edit}
            className="min-h-[360px] flex-1"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-fg-subtle">
              Running code against the tests is coming soon. For now, submit when you&apos;re done.
            </p>
            <Button onClick={() => void submit()} disabled={busy || !code.trim()}>
              {busy ? "Submitting…" : "Submit solution"}
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
