"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { parseTheme, THEME_COOKIE, type Theme, themeAttribute } from "@/lib/theme";

const LABELS: Record<Theme, string> = { light: "Light", dark: "Dark", system: "System" };

function currentTheme(): Theme {
  const match = document.cookie.match(new RegExp(`(?:^|; )${THEME_COOKIE}=([^;]*)`));
  return parseTheme(match?.[1]);
}

/** Light / Dark / System, applied at once and remembered for a year. Only rendered in the browser. */
export function ThemeSwitcher() {
  const [theme, setTheme] = useState<Theme>(currentTheme);

  const choose = (next: Theme) => {
    setTheme(next);
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    const attr = themeAttribute(next);
    if (attr) document.documentElement.dataset.theme = attr;
    else delete document.documentElement.dataset.theme;
  };

  return (
    <div role="radiogroup" aria-label="Theme" className="flex rounded-full bg-surface-grey p-1">
      {(Object.keys(LABELS) as Theme[]).map((t) => (
        <button
          key={t}
          type="button"
          role="radio"
          aria-checked={theme === t}
          onClick={() => choose(t)}
          className={cn(
            "flex-1 rounded-full px-2 py-1 text-sm transition",
            theme === t ? "bg-bg font-medium shadow-sm" : "text-fg-subtle hover:text-fg",
          )}
        >
          {LABELS[t]}
        </button>
      ))}
    </div>
  );
}
