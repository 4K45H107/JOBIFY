"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import {
  type JobDetail,
  jobCreateSchema,
  JobType,
  type JobSummary,
  jobUpdateSchema,
  QuestionKind,
  Workplace,
} from "@jobify/shared";
import { z } from "zod";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { ChipsInput } from "@/components/ui/ChipsInput";
import { SelectField, TextAreaField } from "@/components/ui/Field";
import { TextField } from "@/components/ui/TextField";
import { api } from "@/lib/api/client";
import { JOB_TYPE_LABELS, WORKPLACE_LABELS } from "@/lib/labels";
import { JobCard } from "./JobCard";

const QUESTION_LABELS: Record<QuestionKind, string> = {
  YES_NO: "Yes / No",
  NUMBER: "Number",
  TEXT: "Short answer",
};
const COUNTRIES = [
  "Bangladesh",
  "India",
  "Singapore",
  "Germany",
  "United Kingdom",
  "Canada",
  "United States",
  "Netherlands",
];

/** What the inputs hold: strings for numbers and dates, "" for empty. */
interface FormValues {
  title: string;
  type: JobType;
  workplace: Workplace;
  country: string;
  city: string;
  salaryMin: string;
  salaryMax: string;
  ageMin: string;
  ageMax: string;
  deadline: string;
  description: string;
  skills: string[];
  screeningQuestions: { prompt: string; kind: QuestionKind; required: boolean }[];
}

const num = (v: string) => (v.trim() === "" ? null : Number(v));

/** Form values -> API payload; the shared schema then validates it exactly as the API will. */
function toPayload(v: FormValues) {
  return {
    title: v.title,
    type: v.type,
    workplace: v.workplace,
    country: v.country,
    city: v.city,
    salaryMin: num(v.salaryMin) ?? NaN,
    salaryMax: num(v.salaryMax) ?? NaN,
    ageMin: num(v.ageMin),
    ageMax: num(v.ageMax),
    deadline: v.deadline || null,
    description: v.description,
    skills: v.skills,
    screeningQuestions: v.screeningQuestions,
  };
}

function toForm(job?: JobDetail): FormValues {
  return {
    title: job?.title ?? "",
    type: job?.type ?? "FULL_TIME",
    workplace: job?.workplace ?? "ONSITE",
    country: job?.country ?? "",
    city: job?.city ?? "",
    salaryMin: job?.salaryMin.toString() ?? "",
    salaryMax: job?.salaryMax.toString() ?? "",
    ageMin: job?.ageMin?.toString() ?? "",
    ageMax: job?.ageMax?.toString() ?? "",
    deadline: job?.deadline ?? "",
    description: job?.description ?? "",
    skills: job?.skills ?? [],
    screeningQuestions:
      job?.screeningQuestions.map(({ prompt, kind, required }) => ({ prompt, kind, required })) ??
      [],
  };
}

/** Figma "AddJobs": the form, with a live job-card preview ("Post :"). */
export function JobForm({
  job,
  companyName,
  companyLogo,
}: {
  job?: JobDetail;
  companyName: string;
  companyLogo: string | null;
}) {
  const router = useRouter();
  const editing = Boolean(job);
  const questionsLocked = (job?.applicants ?? 0) > 0;
  const [error, setError] = useState<string | null>(null);
  const schema = z.preprocess(
    (v) => toPayload(v as FormValues),
    editing ? jobUpdateSchema : jobCreateSchema,
  );

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    // The resolver validates the converted payload, so errors map back to the same field names.
    // raw: the submit handler gets the form's own values (strings), not the parsed payload.
    resolver: zodResolver(schema as unknown as z.ZodType<FormValues, FormValues>, undefined, {
      raw: true,
    }),
    defaultValues: toForm(job),
  });
  const questions = useFieldArray({ control, name: "screeningQuestions" });
  const values = watch();

  const submit = (status?: "OPEN" | "DRAFT") =>
    handleSubmit(async (formValues) => {
      setError(null);
      const payload = toPayload(formValues);
      try {
        const saved = editing
          ? await api<JobDetail>(`/jobs/${job!.id}`, {
              method: "PATCH",
              json: questionsLocked ? { ...payload, screeningQuestions: undefined } : payload,
            })
          : await api<JobDetail>("/jobs", { method: "POST", json: { ...payload, status } });
        router.push(`/employer/jobs/${saved.id}`);
        router.refresh();
      } catch {
        setError("Couldn't save the job. Check the form and try again.");
      }
    });

  const preview: JobSummary = {
    id: "preview",
    title: values.title || "Job title",
    type: values.type,
    workplace: values.workplace,
    country: values.country || "Country",
    city: values.city || null,
    salaryMin: Number(values.salaryMin) || 0,
    salaryMax: Number(values.salaryMax) || 0,
    status: job?.status ?? "OPEN",
    deadline: values.deadline || null,
    createdAt: job?.createdAt ?? new Date().toISOString(),
    company: { id: "", name: companyName, slug: "", logoUrl: companyLogo },
    skills: values.skills,
    hasAssessment: job?.hasAssessment ?? false,
    saved: false,
    applicants: job?.applicants ?? 0,
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <Card>
        <CardHeader
          title={editing ? "Edit job" : "Add job"}
          description={editing ? undefined : `Posting for ${companyName}`}
        />
        <form onSubmit={submit("OPEN")} noValidate className="grid gap-4 sm:grid-cols-2">
          {error && <Alert className="sm:col-span-2">{error}</Alert>}
          <TextField
            label="Job title"
            className="sm:col-span-2"
            error={errors.title?.message}
            {...register("title")}
          />
          <SelectField label="Job type" {...register("type")}>
            {JobType.options.map((t) => (
              <option key={t} value={t}>
                {JOB_TYPE_LABELS[t]}
              </option>
            ))}
          </SelectField>
          <SelectField label="Workplace" {...register("workplace")}>
            {Workplace.options.map((w) => (
              <option key={w} value={w}>
                {WORKPLACE_LABELS[w]}
              </option>
            ))}
          </SelectField>
          <TextField
            label="Country"
            list="countries"
            error={errors.country?.message}
            {...register("country")}
          />
          <datalist id="countries">
            {COUNTRIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <TextField
            label="City"
            hint="Leave empty for country-wide"
            error={errors.city?.message}
            {...register("city")}
          />
          <TextField
            label="Salary from (USD / year)"
            type="number"
            min={0}
            step={1000}
            error={errors.salaryMin?.message}
            {...register("salaryMin")}
          />
          <TextField
            label="Salary to (USD / year)"
            type="number"
            min={0}
            step={1000}
            error={errors.salaryMax?.message}
            {...register("salaryMax")}
          />
          <TextField
            label="Minimum age"
            type="number"
            min={14}
            hint="Optional"
            error={errors.ageMin?.message}
            {...register("ageMin")}
          />
          <TextField
            label="Maximum age"
            type="number"
            min={14}
            hint="Optional"
            error={errors.ageMax?.message}
            {...register("ageMax")}
          />
          <TextField
            label="Apply by"
            type="date"
            hint="Optional"
            error={errors.deadline?.message}
            {...register("deadline")}
          />
          <TextAreaField
            label="Brief"
            rows={8}
            className="sm:col-span-2"
            placeholder="What the role is, what they'll work on, and what you're looking for."
            error={errors.description?.message}
            {...register("description")}
          />
          <div className="sm:col-span-2">
            <Controller
              control={control}
              name="skills"
              render={({ field }) => (
                <ChipsInput
                  label="Skills"
                  value={field.value}
                  onChange={field.onChange}
                  max={15}
                  placeholder="e.g. React"
                />
              )}
            />
          </div>

          <fieldset className="flex flex-col gap-3 sm:col-span-2" disabled={questionsLocked}>
            <legend className="mb-1 text-sm font-medium tracking-label text-fg-muted">
              Screening questions{" "}
              {questionsLocked && (
                <span className="font-normal text-fg-subtle">(locked: people have applied)</span>
              )}
            </legend>
            {questions.fields.map((field, i) => (
              <div
                key={field.id}
                className="grid gap-2 rounded-[10px] bg-surface-grey p-3 sm:grid-cols-[1fr_auto_auto_auto]"
              >
                <TextField
                  label={`Question ${i + 1}`}
                  error={errors.screeningQuestions?.[i]?.prompt?.message}
                  {...register(`screeningQuestions.${i}.prompt`)}
                />
                <SelectField label="Answer" {...register(`screeningQuestions.${i}.kind`)}>
                  {QuestionKind.options.map((k) => (
                    <option key={k} value={k}>
                      {QUESTION_LABELS[k]}
                    </option>
                  ))}
                </SelectField>
                <label className="flex items-center gap-2 self-end pb-3 text-sm">
                  <input type="checkbox" {...register(`screeningQuestions.${i}.required`)} />
                  Required
                </label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="self-end"
                  onClick={() => questions.remove(i)}
                >
                  Remove
                </Button>
              </div>
            ))}
            {questions.fields.length < 10 && (
              <Button
                variant="outline"
                size="sm"
                className="self-start"
                onClick={() => questions.append({ prompt: "", kind: "YES_NO", required: true })}
              >
                Add question +
              </Button>
            )}
          </fieldset>

          <div className="flex flex-wrap gap-3 pt-2 sm:col-span-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : editing ? "Save changes" : "Publish job"}
            </Button>
            {!editing && (
              <Button variant="outline" disabled={isSubmitting} onClick={submit("DRAFT")}>
                Save as draft
              </Button>
            )}
            <Button variant="ghost" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>

      <aside className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Preview</h2>
        <div className="rounded-[10px] border border-border px-2">
          <JobCard job={preview} showSave={false} />
        </div>
        <p className="text-sm text-fg-subtle">
          Skill tests (MCQ) are added from the job page once it&apos;s saved. That arrives with the
          screening task.
        </p>
      </aside>
    </div>
  );
}
