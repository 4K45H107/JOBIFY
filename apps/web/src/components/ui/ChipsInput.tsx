"use client";

import { matchSuggestions } from "@jobify/shared";
import { useEffect, useId, useState } from "react";
import { cn } from "@/lib/cn";
import { SuggestionList, useSuggestionKeys } from "./Suggestions";

/**
 * Free-text tags: type and press Enter or comma to add, × to remove. Suggestions filter as you
 * type (from the front first); pick one with the mouse or the arrow keys and Enter.
 */
export function ChipsInput({
  label,
  value,
  onChange,
  max,
  placeholder,
  suggestions = [],
  loadSuggestions,
  hint,
}: {
  label: string;
  value: string[];
  onChange: (next: string[]) => void;
  max: number;
  placeholder?: string;
  /** A fixed word list (e.g. common skills). */
  suggestions?: readonly string[];
  /** More options for what's typed (e.g. skills already in use), merged with the list. */
  loadSuggestions?: (query: string) => Promise<string[]>;
  hint?: string;
}) {
  const id = useId();
  const listId = `${id}-suggestions`;
  const [draft, setDraft] = useState("");
  const [focused, setFocused] = useState(false);
  const [loaded, setLoaded] = useState<string[]>([]);
  const full = value.length >= max;

  // Ask for extra options a moment after typing stops.
  useEffect(() => {
    const q = draft.trim();
    if (!loadSuggestions || !q) return setLoaded([]);
    let current = true;
    const timer = setTimeout(() => {
      loadSuggestions(q)
        .then((r) => current && setLoaded(r))
        .catch(() => {});
    }, 200);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [draft, loadSuggestions]);

  const options =
    focused && draft.trim() && !full
      ? matchSuggestions(draft, [...suggestions, ...loaded], { exclude: value })
      : [];

  const add = (raw: string) => {
    const item = raw.trim();
    if (!item || full || value.some((v) => v.toLowerCase() === item.toLowerCase()))
      return setDraft("");
    onChange([...value, item]);
    setDraft("");
  };
  const keys = useSuggestionKeys(options, add);

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium tracking-label text-fg-muted">
        {label}
      </label>
      <div className="relative">
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
            role="combobox"
            aria-expanded={options.length > 0}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={keys.active >= 0 ? `${listId}-${keys.active}` : undefined}
            autoComplete="off"
            value={draft}
            disabled={full}
            placeholder={full ? `Up to ${max}` : placeholder}
            onChange={(e) => {
              setDraft(e.target.value);
              keys.setActive(-1);
            }}
            onFocus={() => setFocused(true)}
            onKeyDown={(e) => {
              if (keys.onKeyDown(e)) return;
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                add(draft);
              } else if (e.key === "Escape" && options.length) {
                e.preventDefault();
                setFocused(false);
              } else if (e.key === "Backspace" && !draft && value.length) {
                onChange(value.slice(0, -1));
              }
            }}
            onBlur={() => {
              setFocused(false);
              add(draft);
            }}
            className={cn(
              "min-w-32 flex-1 bg-transparent px-1 py-1 outline-none",
              full && "cursor-not-allowed",
            )}
          />
        </div>
        <SuggestionList
          id={listId}
          options={options}
          active={keys.active}
          onPick={add}
          onHover={keys.setActive}
        />
      </div>
      {hint && <p className="text-sm text-fg-subtle">{hint}</p>}
    </div>
  );
}
