"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  assessmentInput,
  type Applicant,
  mcqQuestionInput,
  type McqQuestionInput,
  type TeamAssessment,
} from "@jobify/shared";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { SelectField } from "@/components/ui/Field";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { TextField } from "@/components/ui/TextField";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { cn } from "@/lib/cn";

const blank = (): McqQuestionInput => ({ prompt: "", options: ["", ""], correctIndex: -1 });

/** Figma "ADD MCQ": Questions | Responses, the question list, then "Add Questions +". */
export function McqBuilder({
  jobId,
  jobTitle,
  initial,
  responses,
  tab,
}: {
  jobId: string;
  jobTitle: string;
  initial: TeamAssessment | null;
  responses: Applicant[];
  tab: "questions" | "responses";
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? `${jobTitle} skill test`);
  const [timeLimit, setTimeLimit] = useState(String(initial?.timeLimitMin ?? 15));
  const [questions, setQuestions] = useState<McqQuestionInput[]>(
    initial?.questions.map(({ prompt, options, correctIndex }) => ({
      prompt,
      options,
      correctIndex,
    })) ?? [],
  );
  const [draft, setDraft] = useState<McqQuestionInput>(blank);
  const [editing, setEditing] = useState<number | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const locked = initial?.locked ?? false;

  const commitDraft = () => {
    const cleaned = { ...draft, options: draft.options.map((o) => o.trim()) };
    if (cleaned.correctIndex < 0) return setDraftError("Pick the correct answer");
    const parsed = mcqQuestionInput.safeParse(cleaned);
    if (!parsed.success)
      return setDraftError(parsed.error.issues[0]?.message ?? "Check the question");
    setQuestions((list) =>
      editing === null
        ? [...list, parsed.data]
        : list.map((q, i) => (i === editing ? parsed.data : q)),
    );
    setDraft(blank());
    setEditing(null);
    setDraftError(null);
    setSaved(false);
  };

  const save = async () => {
    setError(null);
    const parsed = assessmentInput.safeParse({ title, timeLimitMin: Number(timeLimit), questions });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Check the test");
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
    if (!confirm("Remove this skill test? New applicants won't take a test.")) return;
    try {
      await api(`/jobs/${jobId}/assessment`, { method: "DELETE" });
      router.push(`/employer/jobs/${jobId}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't remove the test.");
    }
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header>
        <p className="text-sm tracking-label text-fg-subtle uppercase">Skill test</p>
        <h1 className="text-2xl font-medium">{jobTitle}</h1>
      </header>
      <SegmentedTabs
        tabs={[
          {
            label: "Questions",
            href: `/employer/jobs/${jobId}/assessment`,
            active: tab === "questions",
          },
          {
            label: "Responses",
            href: `/employer/jobs/${jobId}/assessment?tab=responses`,
            active: tab === "responses",
          },
        ]}
      />

      {tab === "responses" ? (
        <Responses assessment={initial} responses={responses} />
      ) : (
        <>
          {locked && (
            <Alert>
              Candidates have already taken this test, so its questions can&apos;t change any more.
            </Alert>
          )}
          {error && <Alert>{error}</Alert>}

          <Card>
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
                value={timeLimit}
                disabled={locked}
                onChange={(e) => (setTimeLimit(e.target.value), setSaved(false))}
              />
            </div>
          </Card>

          <ol className="flex flex-col gap-6" aria-label="Questions">
            {questions.map((q, i) => (
              <li key={i} className="rounded-[10px] border border-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-lg">
                    {i + 1}. {q.prompt}
                  </p>
                  {!locked && (
                    <div className="flex shrink-0 gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => (setDraft(q), setEditing(i), setDraftError(null))}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => (
                          setQuestions((l) => l.filter((_, j) => j !== i)),
                          setSaved(false)
                        )}
                      >
                        Remove
                      </Button>
                    </div>
                  )}
                </div>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {q.options.map((o, j) => (
                    <li
                      key={j}
                      className={cn(
                        "rounded-[10px] border px-3 py-2",
                        j === q.correctIndex
                          ? "border-success bg-success/15 font-medium"
                          : "border-border",
                      )}
                    >
                      {o}
                      {j === q.correctIndex && <span className="sr-only"> (correct)</span>}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
            {questions.length === 0 && (
              <li className="text-fg-subtle">No questions yet. Add the first one below.</li>
            )}
          </ol>

          {!locked && (
            <Card>
              <CardHeader
                title={editing === null ? "Add questions +" : `Edit question ${editing + 1}`}
              />
              <div className="flex flex-col gap-4">
                {draftError && <Alert>{draftError}</Alert>}
                <TextField
                  label="Your question"
                  value={draft.prompt}
                  onChange={(e) => setDraft({ ...draft, prompt: e.target.value })}
                />
                <fieldset className="flex flex-col gap-2">
                  <legend className="mb-1 text-sm font-medium tracking-label text-fg-muted">
                    Options
                  </legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {draft.options.map((o, j) => (
                      <div key={j} className="flex items-center gap-2">
                        <input
                          aria-label={`Option ${j + 1}`}
                          value={o}
                          placeholder={`option${j + 1}`}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              options: draft.options.map((x, k) => (k === j ? e.target.value : x)),
                            })
                          }
                          className="h-10 flex-1 rounded-[10px] border border-border bg-bg px-3"
                        />
                        {draft.options.length > 2 && (
                          <button
                            type="button"
                            aria-label={`Remove option ${j + 1}`}
                            className="px-2 text-fg-subtle hover:text-heading-accent"
                            onClick={() =>
                              setDraft({
                                ...draft,
                                options: draft.options.filter((_, k) => k !== j),
                                correctIndex:
                                  draft.correctIndex === j
                                    ? -1
                                    : draft.correctIndex > j
                                      ? draft.correctIndex - 1
                                      : draft.correctIndex,
                              })
                            }
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {draft.options.length < 6 && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="self-start"
                      onClick={() => setDraft({ ...draft, options: [...draft.options, ""] })}
                    >
                      Add options +
                    </Button>
                  )}
                </fieldset>
                <SelectField
                  label="Your answer"
                  value={String(draft.correctIndex)}
                  onChange={(e) => setDraft({ ...draft, correctIndex: Number(e.target.value) })}
                  className="max-w-sm"
                >
                  <option value="-1">Select</option>
                  {draft.options.map((o, j) => (
                    <option key={j} value={j}>
                      {o.trim() || `option${j + 1}`}
                    </option>
                  ))}
                </SelectField>
                <div className="flex gap-3">
                  <Button onClick={commitDraft}>{editing === null ? "Add +" : "Update"}</Button>
                  {editing !== null && (
                    <Button
                      variant="ghost"
                      onClick={() => (setDraft(blank()), setEditing(null), setDraftError(null))}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          )}

          {!locked && (
            <footer className="flex flex-wrap items-center gap-3">
              <Button onClick={save} disabled={busy || questions.length === 0}>
                {busy ? "Saving…" : "Save test"}
              </Button>
              {saved && (
                <span className="text-sm text-success">
                  Saved. New applicants will take this test.
                </span>
              )}
              {initial && (
                <Button variant="ghost" onClick={remove}>
                  Remove test
                </Button>
              )}
            </footer>
          )}
        </>
      )}
    </div>
  );
}

function Responses({
  assessment,
  responses,
}: {
  assessment: TeamAssessment | null;
  responses: Applicant[];
}) {
  if (!assessment)
    return (
      <p className="text-fg-subtle">
        Save the test first. Responses appear here as candidates take it.
      </p>
    );
  const taken = responses.filter((r) => r.test.state === "SUBMITTED");
  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-3 gap-3 text-center">
        {(
          [
            ["Started", assessment.stats.started],
            ["Submitted", assessment.stats.submitted],
            [
              "Average",
              assessment.stats.averageScore === null ? "—" : `${assessment.stats.averageScore}%`,
            ],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="rounded-[10px] bg-surface-grey p-4">
            <dd className="text-2xl font-medium">{value}</dd>
            <dt className="text-sm text-fg-subtle">{label}</dt>
          </div>
        ))}
      </dl>
      <ul className="divide-y divide-border">
        {taken.map((r) => (
          <li key={r.id} className="flex items-center justify-between py-3">
            <span>{r.seeker.fullName}</span>
            <span className="font-medium">{r.test.score}%</span>
          </li>
        ))}
        {taken.length === 0 && <li className="py-3 text-fg-subtle">Nobody has submitted yet.</li>}
      </ul>
    </div>
  );
}
