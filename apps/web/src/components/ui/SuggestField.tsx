"use client";

import { forwardRef, useId, useRef, useState } from "react";
import { matchSuggestions } from "@jobify/shared";
import { SuggestionList, useSuggestionKeys } from "./Suggestions";
import { TextField, type TextFieldProps } from "./TextField";

/** Sets an input's value the way typing would, so React and form libraries see the change. */
function typeInto(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

/**
 * A text field that suggests values as you type (countries, cities, job titles…), best matches
 * from the front first. It still accepts any text; works with react-hook-form's register.
 */
export const SuggestField = forwardRef<
  HTMLInputElement,
  TextFieldProps & {
    suggestions: readonly string[];
    /** Show options as soon as the field is focused, before typing. */
    openOnFocus?: boolean;
  }
>(function SuggestField(
  { suggestions, openOnFocus = false, onChange, onKeyDown, onFocus, onBlur, ...props },
  ref,
) {
  const inner = useRef<HTMLInputElement | null>(null);
  const listId = useId();
  // null while closed; otherwise the text being matched.
  const [query, setQuery] = useState<string | null>(null);
  const options = query === null ? [] : matchSuggestions(query, suggestions);
  const pick = (option: string) => {
    if (inner.current) typeInto(inner.current, option);
    setQuery(null);
  };
  const keys = useSuggestionKeys(options, pick);
  const open = options.length > 0;

  return (
    <TextField
      {...props}
      ref={(el) => {
        inner.current = el;
        if (typeof ref === "function") ref(el);
        else if (ref) ref.current = el;
      }}
      role="combobox"
      aria-expanded={open}
      aria-controls={listId}
      aria-autocomplete="list"
      aria-activedescendant={open && keys.active >= 0 ? `${listId}-${keys.active}` : undefined}
      autoComplete="off"
      onChange={(e) => {
        // A pick also fires onChange; only reopen the list for real typing.
        setQuery(e.target.value && suggestions.includes(e.target.value) ? null : e.target.value);
        keys.setActive(-1);
        onChange?.(e);
      }}
      onFocus={(e) => {
        if (openOnFocus) setQuery(e.target.value);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setQuery(null);
        onBlur?.(e);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          e.preventDefault();
          setQuery(null);
          return;
        }
        if (!keys.onKeyDown(e)) onKeyDown?.(e);
      }}
      addon={
        <SuggestionList
          id={listId}
          options={options}
          active={keys.active}
          onPick={pick}
          onHover={keys.setActive}
        />
      }
    />
  );
});
