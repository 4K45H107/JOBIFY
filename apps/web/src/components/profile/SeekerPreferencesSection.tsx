"use client";

import { type JobPreference, jobPreferenceSchema, type SeekerProfile } from "@jobify/shared";
import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { CheckboxGroup } from "@/components/ui/CheckboxGroup";
import { ChipsInput } from "@/components/ui/ChipsInput";
import { TextField } from "@/components/ui/TextField";
import { api } from "@/lib/api/client";
import { JOB_TYPE_LABELS, options, WORKPLACE_LABELS } from "@/lib/labels";

export function SeekerPreferencesSection({
  profile,
  onSaved,
}: {
  profile: SeekerProfile;
  onSaved: (p: SeekerProfile) => void;
}) {
  const [prefs, setPrefs] = useState<JobPreference>(profile.preferences);
  const [salary, setSalary] = useState(profile.preferences.minSalary?.toString() ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<JobPreference>) => {
    setPrefs((p) => ({ ...p, ...patch }));
    setStatus("idle");
  };

  const save = async () => {
    setError(null);
    const parsed = jobPreferenceSchema.safeParse({
      ...prefs,
      minSalary: salary === "" ? null : Number(salary),
    });
    if (!parsed.success)
      return setError(parsed.error.issues[0]?.message ?? "Check your preferences");
    setStatus("saving");
    try {
      const saved = await api<SeekerProfile>("/me/preferences", {
        method: "PUT",
        json: parsed.data,
      });
      onSaved(saved);
      setStatus("saved");
    } catch {
      setError("Couldn't save your preferences. Please try again.");
      setStatus("idle");
    }
  };

  return (
    <Card>
      <CardHeader title="Job preferences" description="We use these for your “For You” jobs." />
      <div className="flex flex-col gap-5">
        {error && <Alert>{error}</Alert>}
        <ChipsInput
          label="Job titles"
          value={prefs.titles}
          onChange={(titles) => set({ titles })}
          max={10}
          placeholder="e.g. Frontend Developer"
        />
        <ChipsInput
          label="Locations"
          value={prefs.locations}
          onChange={(locations) => set({ locations })}
          max={10}
          placeholder="e.g. Dhaka"
        />
        <CheckboxGroup
          legend="Job type"
          options={options(JOB_TYPE_LABELS)}
          value={prefs.jobTypes}
          onChange={(jobTypes) => set({ jobTypes })}
        />
        <CheckboxGroup
          legend="Workplace"
          options={options(WORKPLACE_LABELS)}
          value={prefs.workplace}
          onChange={(workplace) => set({ workplace })}
        />
        <TextField
          label="Minimum yearly salary (USD)"
          type="number"
          min={0}
          step={1000}
          value={salary}
          onChange={(e) => {
            setSalary(e.target.value);
            setStatus("idle");
          }}
          className="max-w-xs"
        />
        <div className="flex items-center gap-3">
          <Button onClick={save} disabled={status === "saving"}>
            {status === "saving" ? "Saving…" : "Save preferences"}
          </Button>
          {status === "saved" && <span className="text-sm text-success">Saved</span>}
        </div>
      </div>
    </Card>
  );
}
