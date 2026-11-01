export const THEMES = ["light", "dark", "system"] as const;
export type Theme = (typeof THEMES)[number];

/** Read by the root layout, so the first HTML already has the right theme (no flash). */
export const THEME_COOKIE = "jobify-theme";

/** Light unless the visitor picked otherwise. */
export function parseTheme(value: string | undefined): Theme {
  return THEMES.find((t) => t === value) ?? "light";
}

/** `<html data-theme>`: "system" leaves it unset so the CSS follows the OS setting. */
export function themeAttribute(theme: Theme): "light" | "dark" | undefined {
  return theme === "system" ? undefined : theme;
}
