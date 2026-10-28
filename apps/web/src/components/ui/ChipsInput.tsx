"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/cn";

/** Free-text tags: type and press Enter or comma to add, × to remove. */
export function ChipsInput({
  label,
  value,
  onChange,
  max,
  placeholder,
  suggestions = [],
  hint,
}: {
  label: string;
  value: string[];
  onChange: (next: string[]) => void;
  max: number;
  placeholder?: string;
  suggestions?: string[];
  hint?: string;
}) {
  const id = useId();
  const [draft, setDraft] = useState("");
  const full = value.length >= max;

  const add = (raw: string) => {
    const item = raw.trim();
    if (!item || full || value.some((v) => v.toLowerCase() === item.toLowerCase()))
      return setDraft("");
    onChange([...value, item]);
    setDraft("");
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium tracking-label text-fg-muted">
        {label}
      </label>
      <div className="flex min-h-11 flex-wrap items-center gap-2 rounded-[10px] border border-border px-2 py-1.5 focus-within:border-outline focus-within:ring-2 focus-within:ring-chip/60">
        {value.map((item) => (
          <span
            key={item}
            className="flex items-center gap-1 rounded-full bg-surface-muted px-3 py-1 text-sm"
          >
            {item}
            <button
              type="button"
              aria-label={`Remove ${item}`}
              onClick={() => onChange(value.filter((v) => v !== item))}
              className="text-fg-subtle hover:text-fg"
            >
              ×
            </button>
          </span>
        ))}
        <input
          id={id}
          list={suggestions.length ? `${id}-suggestions` : undefined}
          value={draft}
          disabled={full}
          placeholder={full ? `Up to ${max}` : placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add(draft);
            } else if (e.key === "Backspace" && !draft && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={() => add(draft)}
          className={cn(
            "min-w-32 flex-1 bg-transparent px-1 py-1 outline-none",
            full && "cursor-not-allowed",
          )}
        />
        {suggestions.length > 0 && (
          <datalist id={`${id}-suggestions`}>
            {suggestions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        )}
      </div>
      {hint && <p className="text-sm text-fg-subtle">{hint}</p>}
    </div>
  );
}
