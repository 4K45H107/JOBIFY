import { cn } from "@/lib/cn";

export function CheckboxGroup<T extends string>({
  legend,
  options,
  value,
  onChange,
}: {
  legend: string;
  options: { value: T; label: string }[];
  value: T[];
  onChange: (next: T[]) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1.5 text-sm font-medium tracking-label text-fg-muted">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const checked = value.includes(option.value);
          return (
            <label
              key={option.value}
              className={cn(
                "cursor-pointer rounded-full border px-4 py-1.5 text-sm transition",
                checked
                  ? "border-outline bg-chip text-chip-fg"
                  : "border-border hover:bg-surface-grey",
              )}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={checked}
                onChange={() =>
                  onChange(
                    checked ? value.filter((v) => v !== option.value) : [...value, option.value],
                  )
                }
              />
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
