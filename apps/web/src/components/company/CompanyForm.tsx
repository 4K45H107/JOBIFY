"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  type CompanyCreate,
  companyCreateSchema,
  type CompanyDetail,
  COMPANY_SIZE_LABELS,
  CompanySize,
} from "@jobify/shared";
import { z } from "zod";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { SelectField, TextAreaField } from "@/components/ui/Field";
import { TextField } from "@/components/ui/TextField";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";

/** HTML inputs give strings; map blanks to null and numbers to numbers before the shared schema. */
const formSchema = companyCreateSchema.extend({
  size: z.union([z.literal(""), CompanySize]).transform((v) => (v === "" ? null : v)),
  foundedYear: z
    .union([z.literal(""), z.coerce.number().int().min(1800).max(new Date().getFullYear())])
    .transform((v) => (v === "" ? null : v)),
});
type FormInput = z.input<typeof formSchema>;

const toForm = (c?: CompanyDetail): FormInput => ({
  name: c?.name ?? "",
  industry: c?.industry ?? "",
  size: c?.size ?? "",
  foundedYear: c?.foundedYear ?? "",
  website: c?.website ?? "",
  headquarters: c?.headquarters ?? "",
  description: c?.description ?? "",
  mission: c?.mission ?? "",
});

/** Creates a company (POST /companies) or edits the caller's (PATCH /companies/mine). */
export function CompanyForm({
  company,
  onSaved,
  onCancel,
  submitLabel,
}: {
  company?: CompanyDetail;
  onSaved: (company: CompanyDetail) => void;
  onCancel?: () => void;
  submitLabel: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError: setFieldError,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, CompanyCreate>({
    resolver: zodResolver(formSchema),
    defaultValues: toForm(company),
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      onSaved(
        await api<CompanyDetail>(company ? "/companies/mine" : "/companies", {
          method: company ? "PATCH" : "POST",
          json: values,
        }),
      );
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) setFieldError("name", { message: e.message });
      else setError("Couldn't save the company. Please try again.");
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
      {error && <Alert className="sm:col-span-2">{error}</Alert>}
      <TextField label="Company name" error={errors.name?.message} {...register("name")} />
      <TextField
        label="Industry"
        placeholder="e.g. Software"
        error={errors.industry?.message}
        {...register("industry")}
      />
      <SelectField label="Company size" {...register("size")}>
        <option value="">Not set</option>
        {CompanySize.options.map((size) => (
          <option key={size} value={size}>
            {COMPANY_SIZE_LABELS[size]}
          </option>
        ))}
      </SelectField>
      <TextField
        label="Founded"
        type="number"
        placeholder="e.g. 2015"
        error={errors.foundedYear?.message}
        {...register("foundedYear")}
      />
      <TextField
        label="Website"
        type="url"
        placeholder="https://"
        error={errors.website?.message}
        {...register("website")}
      />
      <TextField
        label="Headquarters"
        placeholder="e.g. Dhaka, Bangladesh"
        error={errors.headquarters?.message}
        {...register("headquarters")}
      />
      <TextAreaField
        label="Overview"
        className="sm:col-span-2"
        error={errors.description?.message}
        {...register("description")}
      />
      <TextAreaField
        label="Mission"
        className="sm:col-span-2"
        rows={2}
        error={errors.mission?.message}
        {...register("mission")}
      />
      <div className="flex gap-3 sm:col-span-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : submitLabel}
        </Button>
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
