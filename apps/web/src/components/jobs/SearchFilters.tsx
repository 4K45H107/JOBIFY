"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { type JobType, type Workplace } from "@jobify/shared";
import { Button } from "@/components/ui/Button";
import { CheckboxGroup } from "@/components/ui/CheckboxGroup";
import { TextField } from "@/components/ui/TextField";
import { JOB_TYPE_LABELS, options, WORKPLACE_LABELS } from "@/lib/labels";

export interface FilterValues {
  q: string;
  type: JobType[];
  workplace: Workplace[];
  location: string;
  company: string;
  salary: string;
  sort: string;
}

/** Figma "FILTERS" box (type, salary, location, company) plus a keyword search. Writes the URL. */
export function SearchFilters({ initial }: { initial: FilterValues }) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const set = (patch: Partial<FilterValues>) => setValues((v) => ({ ...v, ...patch }));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const params = new URLSearchParams({ tab: "search" });
    if (values.q.trim()) params.set("q", values.q.trim());
    if (values.type.length) params.set("type", values.type.join(","));
    if (values.workplace.length) params.set("workplace", values.workplace.join(","));
    if (values.location.trim()) params.set("location", values.location.trim());
    if (values.company.trim()) params.set("company", values.company.trim());
    if (values.salary) params.set("salary", values.salary);
    if (values.sort !== "latest") params.set("sort", values.sort);
    router.push(`/explore/jobs?${params}`);
  };

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-4 rounded-[10px] border border-border p-5"
      aria-label="Job filters"
    >
      <h2 className="text-center text-2xl font-bold tracking-label text-link uppercase underline underline-offset-8">
        Filters
      </h2>
      <TextField
        label="Keyword"
        placeholder="Title, skill or company"
        value={values.q}
        onChange={(e) => set({ q: e.target.value })}
      />
      <CheckboxGroup
        legend="Type"
        options={options(JOB_TYPE_LABELS)}
        value={values.type}
        onChange={(type) => set({ type })}
      />
      <CheckboxGroup
        legend="Workplace"
        options={options(WORKPLACE_LABELS)}
        value={values.workplace}
        onChange={(workplace) => set({ workplace })}
      />
      <TextField
        label="Salary at least (USD / year)"
        type="number"
        min={0}
        step={5000}
        value={values.salary}
        onChange={(e) => set({ salary: e.target.value })}
      />
      <TextField
        label="Location"
        placeholder="City or country"
        value={values.location}
        onChange={(e) => set({ location: e.target.value })}
      />
      <TextField
        label="Company"
        value={values.company}
        onChange={(e) => set({ company: e.target.value })}
      />
      <label className="flex flex-col gap-1.5 text-sm font-medium tracking-label text-fg-muted">
        Sort by
        <select
          value={values.sort}
          onChange={(e) => set({ sort: e.target.value })}
          className="h-11 rounded-[10px] border border-border bg-bg px-3 text-base text-fg"
        >
          <option value="latest">Latest</option>
          <option value="trending">Trending</option>
          <option value="salary">Highest salary</option>
        </select>
      </label>
      <div className="flex justify-center gap-3 pt-2">
        <Button type="submit" size="sm">
          Search
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/explore/jobs?tab=search")}
          disabled={
            JSON.stringify(values) ===
            JSON.stringify({
              ...values,
              q: "",
              type: [],
              workplace: [],
              location: "",
              company: "",
              salary: "",
              sort: "latest",
            })
          }
        >
          Clear
        </Button>
      </div>
    </form>
  );
}
