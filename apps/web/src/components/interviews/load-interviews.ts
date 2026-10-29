import type { Interview } from "@jobify/shared";
import type { TabLink } from "@/components/ui/SegmentedTabs";
import { serverApi } from "@/lib/api/server";

/**
 * Data and tabs for the Upcoming / Past interview pages (Figma "Interviews").
 * The pages render <InterviewList> themselves: when the client component was
 * only reachable through a shared server component, Next 15.5 left it out of
 * the client manifest and the page 500'd.
 */
export async function loadInterviewsPage(viewer: "SEEKER" | "EMPLOYER", tab?: string) {
  const scope = tab === "past" ? "past" : "upcoming";
  const base = viewer === "EMPLOYER" ? "/employer/interviews" : "/interviews";
  const interviews = await serverApi<Interview[]>(`/interviews?scope=${scope}`);
  const tabs: TabLink[] = [
    { label: "Upcoming", href: base, active: scope === "upcoming" },
    { label: "Past", href: `${base}?tab=past`, active: scope === "past" },
  ];
  const emptyMessage =
    scope === "past"
      ? "No past interviews."
      : viewer === "EMPLOYER"
        ? "No interviews scheduled. Schedule one from a job's applicants."
        : "No interviews yet. When an employer schedules one, it shows up here.";
  return { scope, interviews, tabs, emptyMessage };
}
