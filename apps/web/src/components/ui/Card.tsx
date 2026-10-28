import { cn } from "@/lib/cn";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn("rounded-[10px] border border-border bg-bg p-5 md:p-6", className)}
      {...props}
    />
  );
}

export function CardHeader({
  title,
  action,
  description,
}: {
  title: string;
  action?: React.ReactNode;
  description?: string;
}) {
  return (
    <header className="mb-5 flex items-start justify-between gap-4">
      <div>
        <h2 className="text-2xl font-medium">{title}</h2>
        {description && <p className="mt-1 text-sm text-fg-subtle">{description}</p>}
      </div>
      {action}
    </header>
  );
}
