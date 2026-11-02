import { useSyncExternalStore } from "react";

/** Dark when chosen (<html data-theme="dark">), or when "System" is chosen and the OS is dark. */
function isDark(): boolean {
  const chosen = document.documentElement.dataset.theme;
  if (chosen) return chosen === "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function subscribe(onChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  media.addEventListener("change", onChange);
  return () => {
    observer.disconnect();
    media.removeEventListener("change", onChange);
  };
}

/** Follows the app's theme, for widgets that need to be told (e.g. the code editor). */
export function useDarkTheme(): boolean {
  return useSyncExternalStore(subscribe, isDark, () => false);
}
