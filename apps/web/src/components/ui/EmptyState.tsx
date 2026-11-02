import { cn } from "@/lib/cn";

/** The grey "nothing here yet" panel lists show when they're empty. */
export function EmptyState({
  title,
  children,
  action,
  className,
}: {
  title?: string;
  children?: React.ReactNode;
  /** A next step, e.g. a link to post a job. */
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 rounded-[10px] bg-surface-grey p-8 text-center text-fg-subtle",
        className,
      )}
    >
      {title && <p className="text-lg font-medium text-fg">{title}</p>}
      {children && <p>{children}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
