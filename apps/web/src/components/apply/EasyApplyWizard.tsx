"use client";

import Link from "next/link";
import { useState } from "react";
import {
  contactSchema,
  type JobDetail,
  type MyApplication,
  type SeekerProfile,
  UPLOAD_LIMITS,
} from "@jobify/shared";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TextAreaField } from "@/components/ui/Field";
import { FileButton } from "@/components/ui/FileButton";
import { TextField } from "@/components/ui/TextField";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { cn } from "@/lib/cn";

const STEPS = ["Contact info", "CV", "Questions"] as const;

/** Figma "Easy Apply 1–3": contact info → CV → employer questions, BACK / NEXT, SUBMIT. */
export function EasyApplyWizard({ job, profile }: { job: JobDetail; profile: SeekerProfile }) {
  const [step, setStep] = useState(0);
  const [first, ...rest] = profile.fullName.split(" ");
  const [contact, setContact] = useState({
    firstName: first ?? "",
    lastName: rest.join(" "),
    email: profile.email,
    phone: profile.phone ?? "",
  });
  const [cvUrl, setCvUrl] = useState(profile.cvUrl);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<MyApplication | null>(null);

  const hasQuestions = job.screeningQuestions.length > 0;
  const lastStep = hasQuestions ? 2 : 1;

  const contactPayload = () => ({
    fullName: `${contact.firstName} ${contact.lastName}`.trim(),
    email: contact.email,
    phone: contact.phone,
  });

  const next = () => {
    setFormError(null);
    if (step === 0) {
      const parsed = contactSchema.safeParse(contactPayload());
      if (!parsed.success) {
        setErrors(
          Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])),
        );
        return;
      }
      setErrors({});
    }
    if (step === 1 && !cvUrl) return setFormError("Upload your CV to continue.");
    if (step === lastStep) return submit();
    setStep(step + 1);
  };

  const submit = async () => {
    setSubmitting(true);
    setErrors({});
    try {
      const application = await api<MyApplication>(`/jobs/${job.id}/applications`, {
        method: "POST",
        json: {
          contact: contactPayload(),
          answers: Object.entries(answers).map(([questionId, answer]) => ({ questionId, answer })),
        },
      });
      setDone(application);
    } catch (e) {
      if (
        e instanceof ApiError &&
        e.status === 400 &&
        e.body?.details &&
        !Array.isArray(e.body.details)
      ) {
        setErrors(e.body.details);
        setFormError("Some answers need attention.");
      } else {
        setFormError(
          e instanceof ApiError ? e.message : "Couldn't send your application. Please try again.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <Card className="mx-auto max-w-xl text-center">
        <h1 className="text-2xl font-medium">Application sent</h1>
        <p className="mt-2 text-fg-muted">
          {job.company.name} has your application for{" "}
          <span className="font-medium">{job.title}</span>.
        </p>
        {done.stage === "TESTING" ? (
          <>
            <p className="mt-4 rounded-[10px] bg-chip/30 p-3 text-sm">
              This job has a short skill test. It&apos;s timed, so start when you&apos;re ready.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link
                href={`/applications/${done.id}/test`}
                className="inline-flex h-10 items-center rounded-full bg-primary px-8 font-medium tracking-label text-primary-fg uppercase"
              >
                Take the test
              </Link>
              <Link
                href="/activities?tab=applications"
                className="inline-flex h-10 items-center rounded-[10px] border border-outline px-6 tracking-label uppercase"
              >
                Later
              </Link>
            </div>
          </>
        ) : (
          <Link
            href="/activities?tab=applications"
            className="mt-6 inline-flex h-10 items-center rounded-full bg-primary px-8 font-medium tracking-label text-primary-fg uppercase"
          >
            View my applications
          </Link>
        )}
      </Card>
    );
  }

  return (
    <Card className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <header>
        <p className="text-sm tracking-label text-fg-subtle uppercase">
          Easy Apply · {job.company.name}
        </p>
        <h1 className="text-2xl font-medium">{job.title}</h1>
        <ol className="mt-4 flex gap-2" aria-label="Steps">
          {STEPS.slice(0, lastStep + 1).map((label, i) => (
            <li key={label} className="flex-1">
              <span
                className={cn(
                  "block h-1.5 rounded-full",
                  i <= step ? "bg-selected" : "bg-surface-muted",
                )}
              />
              <span
                className={cn("mt-1 block text-xs", i === step ? "font-medium" : "text-fg-subtle")}
                aria-current={i === step ? "step" : undefined}
              >
                {label}
              </span>
            </li>
          ))}
        </ol>
      </header>

      {formError && <Alert>{formError}</Alert>}

      {step === 0 && (
        <section aria-labelledby="contact-title" className="flex flex-col gap-4">
          <h2 id="contact-title" className="text-xl">
            Add your contact info
          </h2>
          <TextField
            label="First name"
            value={contact.firstName}
            onChange={(e) => setContact({ ...contact, firstName: e.target.value })}
            error={errors.fullName}
          />
          <TextField
            label="Last name"
            value={contact.lastName}
            onChange={(e) => setContact({ ...contact, lastName: e.target.value })}
          />
          <TextField
            label="Mobile"
            type="tel"
            value={contact.phone}
            onChange={(e) => setContact({ ...contact, phone: e.target.value })}
            error={errors.phone}
          />
          <TextField
            label="Email"
            type="email"
            value={contact.email}
            onChange={(e) => setContact({ ...contact, email: e.target.value })}
            error={errors.email}
          />
        </section>
      )}

      {step === 1 && (
        <section aria-labelledby="cv-title" className="flex flex-col gap-4">
          <h2 id="cv-title" className="text-xl">
            Upload CV
          </h2>
          {cvUrl ? (
            <p className="rounded-[10px] bg-surface-grey p-4 text-sm">
              We&apos;ll send the CV from your profile.{" "}
              <a href={cvUrl} target="_blank" rel="noreferrer" className="text-link underline">
                Open it
              </a>{" "}
              to check, or replace it below.
            </p>
          ) : (
            <p className="rounded-[10px] bg-surface-grey p-4 text-sm">
              You haven&apos;t uploaded a CV yet. A PDF up to 5 MB.
            </p>
          )}
          <FileButton<SeekerProfile>
            endpoint="/me/cv"
            accept={UPLOAD_LIMITS.cv.types}
            maxBytes={UPLOAD_LIMITS.cv.maxBytes}
            onUploaded={(p) => {
              setCvUrl(p.cvUrl);
              setFormError(null);
            }}
            variant="outline"
          >
            {cvUrl ? "Upload a different CV" : "Upload CV"}
          </FileButton>
        </section>
      )}

      {step === 2 && (
        <section aria-labelledby="questions-title" className="flex flex-col gap-5">
          <h2 id="questions-title" className="text-xl">
            Answer these questions from the employer
          </h2>
          {job.screeningQuestions.map((q) =>
            q.kind === "YES_NO" ? (
              <fieldset key={q.id} className="flex flex-col gap-2">
                <legend className="mb-1 font-medium">
                  {q.prompt}
                  {q.required && <span className="text-heading-accent"> *</span>}
                </legend>
                <div className="flex gap-3">
                  {["yes", "no"].map((v) => (
                    <label
                      key={v}
                      className={cn(
                        "cursor-pointer rounded-full border px-5 py-1.5 capitalize",
                        answers[q.id] === v ? "border-outline bg-chip" : "border-border",
                      )}
                    >
                      <input
                        type="radio"
                        name={q.id}
                        value={v}
                        className="sr-only"
                        checked={answers[q.id] === v}
                        onChange={() => setAnswers({ ...answers, [q.id]: v })}
                      />
                      {v}
                    </label>
                  ))}
                </div>
                {errors[q.id] && <p className="text-sm text-heading-accent">{errors[q.id]}</p>}
              </fieldset>
            ) : q.kind === "NUMBER" ? (
              <TextField
                key={q.id}
                label={`${q.prompt}${q.required ? " *" : ""}`}
                type="number"
                min={0}
                value={answers[q.id] ?? ""}
                onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                error={errors[q.id]}
              />
            ) : (
              <TextAreaField
                key={q.id}
                label={`${q.prompt}${q.required ? " *" : ""}`}
                rows={3}
                value={answers[q.id] ?? ""}
                onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                error={errors[q.id]}
              />
            ),
          )}
        </section>
      )}

      <footer className="flex justify-between gap-3">
        <Button
          variant="outline"
          onClick={() => setStep(step - 1)}
          disabled={step === 0 || submitting}
        >
          Back
        </Button>
        <Button onClick={next} disabled={submitting}>
          {step === lastStep ? (submitting ? "Sending…" : "Submit") : "Next"}
        </Button>
      </footer>
    </Card>
  );
}
