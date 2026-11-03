"use client";

import dynamic from "next/dynamic";
import type { CodingLanguage } from "@jobify/shared";
import { cn } from "@/lib/cn";
import { useDarkTheme } from "@/lib/use-dark-theme";

/** Monaco's ids for our languages. */
const MONACO_LANGUAGE: Record<CodingLanguage, string> = {
  python: "python",
  javascript: "javascript",
  cpp: "cpp",
  java: "java",
};

// Monaco (the VS Code editor) is large and browser-only: load it on this page only, from its CDN.
const Monaco = dynamic(() => import("@monaco-editor/react").then((m) => m.Editor), {
  ssr: false,
  loading: () => (
    <div className="h-full animate-pulse bg-surface-grey motion-reduce:animate-none" />
  ),
});

/** The code box: Monaco with syntax highlighting in the app's theme; read-only for reviewers. */
export function CodeEditor({
  value,
  onChange,
  language,
  label,
  readOnly = false,
  className,
}: {
  value: string;
  onChange?: (code: string) => void;
  language: CodingLanguage;
  /** Accessible name for the editor. */
  label: string;
  readOnly?: boolean;
  className?: string;
}) {
  const dark = useDarkTheme();
  return (
    <div className={cn("overflow-hidden rounded-[10px] border border-border", className)}>
      <Monaco
        value={value}
        language={MONACO_LANGUAGE[language]}
        theme={dark ? "vs-dark" : "light"}
        onChange={(code) => onChange?.(code ?? "")}
        options={{
          ariaLabel: label,
          readOnly,
          domReadOnly: readOnly,
          fontSize: 14,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 4,
          // Tab moves focus out when pressed with Ctrl+M, as in VS Code; screen readers get hints.
          accessibilitySupport: "auto",
        }}
      />
    </div>
  );
}
