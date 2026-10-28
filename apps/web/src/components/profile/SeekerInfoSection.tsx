"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { type SeekerProfile, seekerProfileUpdateSchema } from "@jobify/shared";
import { z } from "zod";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { ChipsInput } from "@/components/ui/ChipsInput";
import { SelectField, TextAreaField } from "@/components/ui/Field";
import { TextField } from "@/components/ui/TextField";
import { api } from "@/lib/api/client";
import { EMPLOYMENT_LABELS, options } from "@/lib/labels";

/** Form values are strings; the shared schema turns them into the API shape. */
const formSchema = seekerProfileUpdateSchema.extend({
  birthdate: z.union([z.literal(""), seekerProfileUpdateSchema.shape.birthdate.unwrap().unwrap()]),
  experienceYears: z.union([z.literal(""), z.coerce.number().int().min(0).max(60)]),
  employmentStatus: z.union([
    z.literal(""),
    seekerProfileUpdateSchema.shape.employmentStatus.unwrap().unwrap(),
  ]),
});
type FormInput = z.input<typeof formSchema>;
type FormValues = z.output<typeof formSchema>;

function toForm(p: SeekerProfile): FormInput {
  return {
    fullName: p.fullName,
    headline: p.headline ?? "",
    phone: p.phone ?? "",
    birthdate: p.birthdate ?? "",
    location: p.location ?? "",
    education: p.education ?? "",
    about: p.about ?? "",
    employmentStatus: p.employmentStatus ?? "",
    currentPosition: p.currentPosition ?? "",
    experienceYears: p.experienceYears ?? "",
  };
}

export function SeekerInfoSection({
  profile,
  onSaved,
}: {
  profile: SeekerProfile;
  onSaved: (p: SeekerProfile) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: toForm(profile),
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      const saved = await api<SeekerProfile>("/me/profile", {
        method: "PATCH",
        json: {
          ...values,
          birthdate: values.birthdate || null,
          experienceYears: values.experienceYears === "" ? null : values.experienceYears,
          employmentStatus: values.employmentStatus || null,
        },
      });
      onSaved(saved);
      reset(toForm(saved));
      setEditing(false);
    } catch {
      setError("Couldn't save your profile. Please try again.");
    }
  });

  const rows: [string, string | number | null][] = [
    ["Full name", profile.fullName],
    ["Headline", profile.headline],
    ["Employment status", profile.employmentStatus && EMPLOYMENT_LABELS[profile.employmentStatus]],
    ["Current position", profile.currentPosition],
    ["Experience", profile.experienceYears === null ? null : `${profile.experienceYears} years`],
    ["Location", profile.location],
    ["University / College", profile.education],
    ["Phone", profile.phone],
    ["Birthdate", profile.birthdate],
  ];

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader
          title="My information"
          action={
            !editing && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="flex items-center gap-2 rounded-[8px] px-2 py-1 text-sm hover:bg-surface-grey"
              >
                <Image
                  src="/icons/edit-info.png"
                  alt=""
                  width={28}
                  height={28}
                  className="icon-themed"
                />
                Edit
              </button>
            )
          }
        />

        {!editing ? (
          <dl className="grid gap-x-10 gap-y-5 sm:grid-cols-2">
            {rows.map(([label, value]) => (
              <div key={label}>
                <dt className="text-lg">{label}:</dt>
                <dd className={value ? "text-lg text-fg-muted" : "text-fg-subtle italic"}>
                  {value ?? "Not added"}
                </dd>
              </div>
            ))}
            <div className="sm:col-span-2">
              <dt className="text-lg">About:</dt>
              <dd
                className={
                  profile.about ? "whitespace-pre-line text-fg-muted" : "text-fg-subtle italic"
                }
              >
                {profile.about ?? "Not added"}
              </dd>
            </div>
          </dl>
        ) : (
          <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
            {error && <Alert className="sm:col-span-2">{error}</Alert>}
            <TextField
              label="Full name"
              error={errors.fullName?.message}
              {...register("fullName")}
            />
            <TextField
              label="Headline"
              placeholder="e.g. Frontend developer"
              error={errors.headline?.message}
              {...register("headline")}
            />
            <SelectField label="Employment status" {...register("employmentStatus")}>
              <option value="">Not set</option>
              {options(EMPLOYMENT_LABELS).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </SelectField>
            <TextField
              label="Current position"
              error={errors.currentPosition?.message}
              {...register("currentPosition")}
            />
            <TextField
              label="Years of experience"
              type="number"
              min={0}
              max={60}
              error={errors.experienceYears?.message}
              {...register("experienceYears")}
            />
            <TextField
              label="Location"
              error={errors.location?.message}
              {...register("location")}
            />
            <TextField
              label="University / College"
              error={errors.education?.message}
              {...register("education")}
            />
            <TextField
              label="Phone"
              type="tel"
              error={errors.phone?.message}
              {...register("phone")}
            />
            <TextField
              label="Birthdate"
              type="date"
              error={errors.birthdate?.message}
              {...register("birthdate")}
            />
            <TextAreaField
              label="About"
              className="sm:col-span-2"
              error={errors.about?.message}
              {...register("about")}
            />
            <div className="flex gap-3 sm:col-span-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving…" : "Save"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  reset(toForm(profile));
                  setEditing(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </Card>

      <SkillsCard profile={profile} onSaved={onSaved} />
    </div>
  );
}

function SkillsCard({
  profile,
  onSaved,
}: {
  profile: SeekerProfile;
  onSaved: (p: SeekerProfile) => void;
}) {
  const [skills, setSkills] = useState(profile.skills);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const dirty = skills.join("|") !== profile.skills.join("|");

  const save = async () => {
    setStatus("saving");
    try {
      const saved = await api<SeekerProfile>("/me/skills", { method: "PUT", json: { skills } });
      onSaved(saved);
      setSkills(saved.skills);
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  };

  return (
    <Card>
      <CardHeader title="Skills" description="Used to recommend jobs that fit you." />
      <div
        className="flex flex-col gap-4"
        onFocus={() => {
          if (suggestions.length === 0)
            void api<string[]>("/skills")
              .then(setSuggestions)
              .catch(() => {});
        }}
      >
        <ChipsInput
          label="Your skills"
          value={skills}
          onChange={(next) => {
            setSkills(next);
            setStatus("idle");
          }}
          max={30}
          placeholder="Type a skill and press Enter"
          suggestions={suggestions}
        />
        <div className="flex items-center gap-3">
          <Button onClick={save} disabled={!dirty || status === "saving"}>
            {status === "saving" ? "Saving…" : "Save skills"}
          </Button>
          {status === "saved" && <span className="text-sm text-success">Saved</span>}
          {status === "error" && (
            <span className="text-sm text-heading-accent">Couldn&apos;t save. Try again.</span>
          )}
        </div>
      </div>
    </Card>
  );
}
