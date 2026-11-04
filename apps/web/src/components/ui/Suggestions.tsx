"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

/** The dropdown under a field: options to pick with the mouse or the arrow keys. */
export function SuggestionList({
  id,
  options,
  active,
  onPick,
  onHover,
}: {
  id: string;
  options: string[];
  active: number;
  onPick: (option: string) => void;
  onHover: (index: number) => void;
}) {
  if (!options.length) return null;
  return (
    <ul
      id={id}
      role="listbox"
      className="absolute inset-x-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-[10px] border border-border bg-bg py-1 text-fg shadow-lg"
    >
      {options.map((option, i) => (
        <li
          key={option}
          id={`${id}-${i}`}
          role="option"
          aria-selected={i === active}
          // Keep focus in the field, so picking doesn't count as leaving it.
          onMouseDown={(e) => e.preventDefault()}
          onMouseEnter={() => onHover(i)}
          onClick={() => onPick(option)}
          className={cn("cursor-pointer px-3 py-2 text-sm", i === active && "bg-surface-grey")}
        >
          {option}
        </li>
      ))}
    </ul>
  );
}

/** Arrow keys move through the options, Enter picks, Escape closes. */
export function useSuggestionKeys(options: string[], onPick: (option: string) => void) {
  const [active, setActive] = useState(-1);
  const onKeyDown = (e: React.KeyboardEvent): boolean => {
    if (!options.length) return false;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => (i + step + options.length) % options.length);
      return true;
    }
    if (e.key === "Enter" && active >= 0 && options[active]) {
      e.preventDefault();
      onPick(options[active]);
      setActive(-1);
      return true;
    }
    return false;
  };
  return { active, setActive, onKeyDown };
}
