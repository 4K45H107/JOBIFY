"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Attempt } from "@jobify/shared";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { cn } from "@/lib/cn";

const remaining = (deadline: string) =>
  Math.max(0, Math.floor((Date.parse(deadline) - Date.now()) / 1000));
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/** Figma "MCQUser": intro → timed questions with options in a row → SUBMIT → score. */
export function McqExam({
  applicationId,
  jobTitle,
  initial,
}: {
  applicationId: string;
  jobTitle: string;
  initial: Attempt | null;
}) {
  const [attempt, setAttempt] = useState<Attempt | null>(initial);
  const [choices, setChoices] = useState<Record<string, number>>({});
  const [left, setLeft] = useState(initial ? remaining(initial.deadline) : 0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submitted = useRef(false);

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

  const submit = useCallback(async () => {
    if (!attempt || submitted.current) return;
    submitted.current = true;
    setBusy(true);
    try {
      const graded = await api<Attempt>(`/attempts/${attempt.id}/submit`, {
        method: "POST",
        json: {
          answers: attempt.questions.map((q) => ({
            questionId: q.id,
            optionIndex: choices[q.id] ?? null,
          })),
        },
      });
      setAttempt(graded);
    } catch (e) {
      // Too late or already submitted: reload the attempt to show the recorded result.
      setError(e instanceof ApiError ? e.message : "Couldn't submit. Please try again.");
      if (e instanceof ApiError && e.status === 409) {
        setAttempt(
          await api<Attempt>(`/me/applications/${applicationId}/attempt`, { method: "POST" }),
        );
      } else {
        submitted.current = false;
      }
    } finally {
      setBusy(false);
    }
  }, [applicationId, attempt, choices]);

  // Countdown; submits whatever is selected when time runs out.
  useEffect(() => {
    if (!attempt || attempt.submittedAt) return;
    const timer = setInterval(() => {
      const s = remaining(attempt.deadline);
      setLeft(s);
      if (s === 0) {
        clearInterval(timer);
        void submit();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [attempt, submit]);

  if (!attempt) {
    return (
      <Card className="mx-auto max-w-xl text-center">
        <h1 className="text-2xl font-semibold tracking-label uppercase">MCQ exam</h1>
        <p className="mt-2 text-fg-muted">Skill test for {jobTitle}</p>
        <ul className="mx-auto mt-4 max-w-sm list-disc text-left text-sm text-fg-muted">
          <li>It&apos;s timed. The clock starts when you press Start.</li>
          <li>You can take it once. Unanswered questions count as wrong.</li>
          <li>When time runs out, your selected answers are submitted.</li>
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
      <Card className="mx-auto max-w-xl text-center">
        <h1 className="text-2xl font-medium">Test submitted</h1>
        {error && <Alert className="mt-4">{error}</Alert>}
        <p className="mt-4 text-5xl font-light">{attempt.score}%</p>
        <p className="mt-2 text-fg-muted">
          The hiring team can see your score alongside your application.
        </p>
        <Link href="/activities?tab=applications" className="mt-6 inline-block text-link underline">
          Back to my applications
        </Link>
      </Card>
    );
  }

  const answered = attempt.questions.filter((q) => choices[q.id] !== undefined).length;
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header className="sticky top-0 z-10 flex items-center justify-between bg-bg/95 py-2 backdrop-blur">
        <h1 className="text-2xl font-semibold tracking-label uppercase">MCQ exam</h1>
        <p
          className={cn(
            "rounded-full px-4 py-1 font-medium tabular-nums",
            left < 60 ? "bg-heading-accent/15 text-heading-accent" : "bg-surface-muted",
          )}
          role="timer"
          aria-live="off"
        >
          {mmss(left)} left
        </p>
      </header>
      {error && <Alert>{error}</Alert>}
      <ol className="flex flex-col gap-8">
        {attempt.questions.map((q, i) => (
          <li key={q.id}>
            <fieldset>
              <legend className="mb-3 text-lg">
                {i + 1}. {q.prompt}
              </legend>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {q.options.map((option, index) => (
                  <label
                    key={index}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-[10px] border px-4 py-3 transition",
                      choices[q.id] === index
                        ? "border-outline bg-chip/40"
                        : "border-border hover:bg-surface-grey",
                    )}
                  >
                    <input
                      type="radio"
                      name={q.id}
                      checked={choices[q.id] === index}
                      onChange={() => setChoices({ ...choices, [q.id]: index })}
                    />
                    {option}
                  </label>
                ))}
              </div>
            </fieldset>
          </li>
        ))}
      </ol>
      <footer className="flex items-center justify-between border-t border-border pt-4">
        <span className="text-sm text-fg-subtle">
          {answered} of {attempt.questions.length} answered
        </span>
        <Button
          onClick={() => {
            if (
              answered < attempt.questions.length &&
              !confirm("Some questions are unanswered. Submit anyway?")
            )
              return;
            void submit();
          }}
          disabled={busy}
        >
          {busy ? "Submitting…" : "Submit"}
        </Button>
      </footer>
    </div>
  );
}
