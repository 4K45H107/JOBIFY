import { cn } from "@/lib/cn";

export function Alert({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-[10px] border border-heading-accent/40 bg-heading-accent/10 px-4 py-3 text-sm text-heading-accent",
        className,
      )}
    >
      {children}
    </div>
  );
}
