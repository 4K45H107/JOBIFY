"use client";

import { useEffect, useState } from "react";
import { CODING_LANGUAGE_LABELS, type CodingSubmission } from "@jobify/shared";
import { CodeEditor } from "@/components/coding/CodeEditor";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { formatDate } from "@/lib/format";

/** A candidate's submitted solution, read-only, in a dialog. */
export function CodeViewer({
  applicationId,
  onClose,
}: {
  applicationId: string;
  onClose: () => void;
}) {
  const [submission, setSubmission] = useState<CodingSubmission | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<CodingSubmission>(`/applications/${applicationId}/code`)
      .then(setSubmission)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Couldn't load the code."));
  }, [applicationId]);

  return (
    <Modal
      onClose={onClose}
      labelledBy="code-title"
      className="flex h-[calc(100dvh-4rem)] w-[min(56rem,calc(100vw-2rem))] flex-col overflow-hidden"
    >
      <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <h2 id="code-title" className="truncate font-medium">
            {submission ? `${submission.candidate}'s solution` : "Solution"}
          </h2>
          {submission && (
            <p className="text-sm text-fg-subtle">
              {submission.problem.title}
              {submission.language && ` · ${CODING_LANGUAGE_LABELS[submission.language]}`}
              {submission.submittedAt && ` · submitted ${formatDate(submission.submittedAt)}`}
              {submission.timedOut && " · time ran out (last autosave)"}
            </p>
          )}
        </div>
        <Button size="sm" variant="ghost" onClick={onClose}>
          Close
        </Button>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
        {error && <Alert>{error}</Alert>}
        {!submission && !error && (
          <div className="flex-1 animate-pulse rounded-[10px] bg-surface-grey" />
        )}
        {submission &&
          (submission.code && submission.language ? (
            <CodeEditor
              readOnly
              label={`${submission.candidate}'s code`}
              language={submission.language}
              value={submission.code}
              className="min-h-0 flex-1"
            />
          ) : (
            <p className="text-fg-subtle">
              {submission.submittedAt
                ? "Time ran out before they saved any code."
                : "They haven't submitted a solution yet."}
            </p>
          ))}
        <p className="text-xs text-fg-subtle">
          Not graded automatically yet: running the code against the tests comes later.
        </p>
      </div>
    </Modal>
  );
}
