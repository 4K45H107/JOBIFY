import { forwardRef, useId } from "react";
import { cn } from "@/lib/cn";

export interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, error, hint, className, id, ...props },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={inputId} className="text-sm font-medium tracking-label text-fg-muted">
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          "h-11 rounded-[10px] border bg-bg px-3 text-base text-fg outline-none transition",
          "placeholder:text-fg-subtle focus:border-outline focus:ring-2 focus:ring-chip/60",
          error ? "border-heading-accent" : "border-border",
        )}
        {...props}
      />
      {error ? (
        <p id={`${inputId}-error`} className="text-sm text-heading-accent">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-sm text-fg-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  );
});
