import { forwardRef, useId } from "react";
import { cn } from "@/lib/cn";

const control =
  "w-full rounded-[10px] border bg-bg px-3 text-base text-fg outline-none transition placeholder:text-fg-subtle focus:border-outline focus:ring-2 focus:ring-chip/60";

interface FieldShellProps {
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  children: (props: { id: string; describedBy?: string; invalid: boolean }) => React.ReactNode;
}

/** Label + control + error/hint, shared by every form control. */
export function FieldShell({ label, error, hint, className, children }: FieldShellProps) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium tracking-label text-fg-muted">
        {label}
      </label>
      {children({ id, describedBy, invalid: !!error })}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-heading-accent">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-fg-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
  hint?: string;
};

export const SelectField = forwardRef<HTMLSelectElement, SelectProps>(function SelectField(
  { label, error, hint, className, children, ...props },
  ref,
) {
  return (
    <FieldShell label={label} error={error} hint={hint} className={className}>
      {({ id, describedBy, invalid }) => (
        <select
          ref={ref}
          id={id}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={cn(control, "h-11", invalid ? "border-heading-accent" : "border-border")}
          {...props}
        >
          {children}
        </select>
      )}
    </FieldShell>
  );
});

type TextAreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string;
  hint?: string;
};

export const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextAreaField(
  { label, error, hint, className, ...props },
  ref,
) {
  return (
    <FieldShell label={label} error={error} hint={hint} className={className}>
      {({ id, describedBy, invalid }) => (
        <textarea
          ref={ref}
          id={id}
          rows={4}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={cn(control, "py-2", invalid ? "border-heading-accent" : "border-border")}
          {...props}
        />
      )}
    </FieldShell>
  );
});
