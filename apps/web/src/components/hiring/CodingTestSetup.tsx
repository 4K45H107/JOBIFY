"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  CODING_DIFFICULTY_LABELS,
  CodingDifficulty,
  type CodingProblem,
  type CodingProblemList,
  codingAssessmentInput,
  type TeamAssessment,
} from "@jobify/shared";
import { DifficultyBadge, ProblemStatement } from "@/components/coding/ProblemStatement";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TextField } from "@/components/ui/TextField";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { cn } from "@/lib/cn";

/** A sensible default time for each difficulty. */
const DEFAULT_MINUTES: Record<CodingDifficulty, number> = { EASY: 30, MEDIUM: 45, HARD: 60 };

/**
 * Coding test for a job: pick a problem from the built-in library (filter, preview, use), set
 * the time, save. Replaces an existing multiple-choice test until someone has taken it.
 */
export function CodingTestSetup({
  jobId,
  jobTitle,
  initial,
  library,
}: {
  jobId: string;
  jobTitle: string;
  /** The job's current test of either kind, if any. */
  initial: TeamAssessment | null;
  library: CodingProblemList;
}) {
  const router = useRouter();
  const current = initial?.kind === "CODING" ? initial : null;
  const locked = current?.locked ?? false;

  const [chosen, setChosen] = useState<CodingProblem | null>(current?.problem ?? null);
  const [browsing, setBrowsing] = useState(!current);
  const [preview, setPreview] = useState<CodingProblem | null>(current?.problem ?? null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [difficulty, setDifficulty] = useState<CodingDifficulty | null>(null);
  const [topic, setTopic] = useState("");
  const [q, setQ] = useState("");
  const [title, setTitle] = useState(current?.title ?? `${jobTitle} coding test`);
  const [minutes, setMinutes] = useState(String(current?.timeLimitMin ?? 45));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const problems = useMemo(() => {
    const text = q.trim().toLowerCase();
    return library.items.filter(
      (p) =>
        (!difficulty || p.difficulty === difficulty) &&
        (!topic || p.topics.includes(topic)) &&
        (!text || p.title.toLowerCase().includes(text) || p.summary.toLowerCase().includes(text)),
    );
  }, [library.items, difficulty, topic, q]);

  const open = async (slug: string) => {
    if (preview?.slug === slug) return;
    setLoadingPreview(true);
    try {
      setPreview(await api<CodingProblem>(`/coding-problems/${slug}`));
    } catch {
      setError("Couldn't load that problem.");
    } finally {
      setLoadingPreview(false);
    }
  };

  // Show the first match when nothing is open yet, so the preview is never empty.
  useEffect(() => {
    if (browsing && !preview && problems[0]) void open(problems[0].slug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [browsing]);

  const use = (problem: CodingProblem) => {
    setChosen(problem);
    setBrowsing(false);
    setSaved(false);
    if (!current) setMinutes(String(DEFAULT_MINUTES[problem.difficulty]));
  };

  const save = async () => {
    setError(null);
    const parsed = codingAssessmentInput.safeParse({
      kind: "CODING",
      title,
      timeLimitMin: Number(minutes),
      problemSlug: chosen?.slug ?? "",
    });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Check the test");
    if (
      initial?.kind === "MCQ" &&
      !confirm("This replaces the job's multiple-choice test. Continue?")
    )
      return;
    setBusy(true);
    try {
      await api<TeamAssessment>(`/jobs/${jobId}/assessment`, { method: "PUT", json: parsed.data });
      setSaved(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't save the test.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm("Remove this coding test? New applicants won't take a test.")) return;
    try {
      await api(`/jobs/${jobId}/assessment`, { method: "DELETE" });
      router.push(`/employer/jobs/${jobId}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't remove the test.");
    }
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm tracking-label text-fg-subtle uppercase">Coding test</p>
          <h1 className="text-2xl font-medium">{jobTitle}</h1>
        </div>
        <Link href={`/employer/jobs/${jobId}`} className="text-sm text-link underline">
          Back to the job
        </Link>
      </header>

      {initial?.kind === "MCQ" && !initial.locked && (
        <Alert>This job has a multiple-choice test. Saving a coding test replaces it.</Alert>
      )}
      {locked && (
        <Alert>
          {current?.stats.submitted} candidate(s) have submitted solutions, so the problem
          can&apos;t change any more.
        </Alert>
      )}
      {error && <Alert>{error}</Alert>}

      {!browsing && chosen && (
        <Card className="flex flex-col gap-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm text-fg-subtle">Problem</p>
              <p className="text-xl font-medium">{chosen.title}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-fg-muted">
                <DifficultyBadge difficulty={chosen.difficulty} />
                {chosen.samples.length} sample tests · {chosen.hiddenTests} hidden
              </div>
            </div>
            {!locked && (
              <Button variant="outline" size="sm" onClick={() => setBrowsing(true)}>
                Change problem
              </Button>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
            <TextField
              label="Test title"
              value={title}
              disabled={locked}
              onChange={(e) => (setTitle(e.target.value), setSaved(false))}
            />
            <TextField
              label="Time limit (minutes)"
              type="number"
              min={1}
              max={180}
              value={minutes}
              disabled={locked}
              onChange={(e) => (setMinutes(e.target.value), setSaved(false))}
            />
          </div>
          <p className="text-sm text-fg-subtle">
            Candidates write their answer in Python, JavaScript, C++ or Java and submit the code.
            You&apos;ll read it from the applicants list. Automatic grading against the tests comes
            later.
          </p>
          {!locked && (
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={save} disabled={busy}>
                {busy ? "Saving…" : current ? "Save changes" : "Save coding test"}
              </Button>
              {current && current.stats.started === 0 && (
                <Button variant="ghost" onClick={remove}>
                  Remove test
                </Button>
              )}
              {saved && (
                <p role="status" className="text-sm text-success">
                  Saved. New applicants will get this problem.
                </p>
              )}
            </div>
          )}
          <details className="rounded-[10px] border border-border p-4">
            <summary className="font-medium">What candidates see</summary>
            <div className="mt-4">
              <ProblemStatement problem={chosen} showHiddenCount />
            </div>
          </details>
        </Card>
      )}

      {browsing && (
        <section aria-labelledby="library-title" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="library-title" className="text-xl font-medium">
                Pick a problem
              </h2>
              <p className="text-sm text-fg-subtle">
                {library.items.length} ready-made problems, each with sample and hidden tests.
              </p>
            </div>
            {chosen && (
              <Button variant="ghost" size="sm" onClick={() => setBrowsing(false)}>
                Cancel
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div role="group" aria-label="Difficulty" className="flex flex-wrap gap-2">
              {[null, ...CodingDifficulty.options].map((d) => (
                <button
                  key={d ?? "all"}
                  type="button"
                  aria-pressed={difficulty === d}
                  onClick={() => setDifficulty(d)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-sm",
                    difficulty === d
                      ? "border-outline bg-chip text-chip-fg"
                      : "border-border hover:bg-surface-grey",
                  )}
                >
                  {d ? CODING_DIFFICULTY_LABELS[d] : "All"}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm">
              <span className="sr-only">Topic</span>
              <select
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="h-9 rounded-[8px] border border-border bg-bg px-2"
              >
                <option value="">All topics</option>
                {library.topics.map((t) => (
                  <option key={t} value={t}>
                    {t.replace(/-/g, " ")}
                  </option>
                ))}
              </select>
            </label>
            <label className="min-w-48 flex-1">
              <span className="sr-only">Search problems</span>
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search problems"
                className="h-9 w-full rounded-[8px] border border-border bg-bg px-3 text-sm"
              />
            </label>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <ul
              aria-label="Problems"
              className="flex flex-col gap-2 lg:max-h-[70dvh] lg:overflow-y-auto lg:pr-1"
            >
              {problems.length === 0 && (
                <li className="rounded-[10px] bg-surface-grey p-6 text-center text-fg-subtle">
                  No problems match these filters.
                </li>
              )}
              {problems.map((p) => (
                <li key={p.slug}>
                  <button
                    type="button"
                    aria-current={preview?.slug === p.slug ? "true" : undefined}
                    onClick={() => void open(p.slug)}
                    className={cn(
                      "flex w-full flex-col gap-1 rounded-[10px] border p-3 text-left transition",
                      preview?.slug === p.slug
                        ? "border-outline bg-surface-grey"
                        : "border-border hover:bg-surface-grey",
                    )}
                  >
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{p.title}</span>
                      <DifficultyBadge difficulty={p.difficulty} />
                    </span>
                    <span className="text-sm text-fg-muted">{p.summary}</span>
                    <span className="text-xs text-fg-subtle">
                      {p.topics.map((t) => t.replace(/-/g, " ")).join(" · ")}
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            <div
              aria-live="polite"
              aria-label="Problem preview"
              role="region"
              tabIndex={0}
              className="rounded-[10px] border border-border p-5 lg:max-h-[70dvh] lg:overflow-y-auto"
            >
              {loadingPreview && !preview ? (
                <div className="h-64 animate-pulse rounded-[8px] bg-surface-grey" />
              ) : preview ? (
                <div className="flex flex-col gap-5">
                  <div className="flex justify-end">
                    <Button onClick={() => use(preview)} disabled={chosen?.slug === preview.slug}>
                      {chosen?.slug === preview.slug ? "Current problem" : "Use this problem"}
                    </Button>
                  </div>
                  <ProblemStatement problem={preview} showHiddenCount />
                </div>
              ) : (
                <p className="text-fg-subtle">Pick a problem to preview it.</p>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
