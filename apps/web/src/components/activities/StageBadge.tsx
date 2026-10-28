import type { ApplicationStage } from "@jobify/shared";
import { cn } from "@/lib/cn";

export const STAGE_LABELS: Record<ApplicationStage, string> = {
  APPLIED: "Applied",
  TESTING: "Skill test",
  SHORTLISTED: "Shortlisted",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  REJECTED: "Not selected",
  WITHDRAWN: "Withdrawn",
};

const STYLES: Record<ApplicationStage, string> = {
  APPLIED: "bg-surface-muted",
  TESTING: "bg-chip/40",
  SHORTLISTED: "bg-success/25",
  INTERVIEW: "bg-selected/15 text-selected",
  OFFER: "bg-success/50",
  REJECTED: "bg-heading-accent/15 text-heading-accent",
  WITHDRAWN: "bg-surface-muted text-fg-subtle",
};

export function StageBadge({ stage }: { stage: ApplicationStage }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 text-xs font-medium tracking-label uppercase",
        STYLES[stage],
      )}
    >
      {STAGE_LABELS[stage]}
    </span>
  );
}
