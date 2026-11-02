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
  level = 2,
}: {
  title: string;
  /** 1 when the card's title is the page's heading. */
  level?: 1 | 2;
  action?: React.ReactNode;
  description?: string;
}) {
  const Heading = level === 1 ? "h1" : "h2";
  return (
    <header className="mb-5 flex items-start justify-between gap-4">
      <div>
        <Heading className="text-2xl font-medium">{title}</Heading>
        {description && <p className="mt-1 text-sm text-fg-subtle">{description}</p>}
      </div>
      {action}
    </header>
  );
}
