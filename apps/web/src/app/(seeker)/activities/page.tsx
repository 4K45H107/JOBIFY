import type { Metadata } from "next";
import Link from "next/link";
import type { JobSummary, MyApplications } from "@jobify/shared";
import { MyApplicationsView } from "@/components/activities/MyApplicationsView";
import { SavedJobs } from "@/components/activities/SavedJobs";
import { JobBrowser } from "@/components/jobs/JobBrowser";
import { EmptyState } from "@/components/ui/EmptyState";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { serverApi } from "@/lib/api/server";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Activities" };

const TABS = [
  { id: "recent", label: "Recent" },
  { id: "alerts", label: "Job Alerts" },
  { id: "saved", label: "Saved" },
  { id: "applications", label: "Applications" },
] as const;
type TabId = (typeof TABS)[number]["id"];

/** Figma "Activities": Recent Searches / Job Alerts / Saved / Applications. */
export default async function ActivitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const requested = (await searchParams).tab;
  const tab: TabId = TABS.find((t) => t.id === requested)?.id ?? "saved";

  return (
    // Saved and Recent are master–detail views that fill the screen.
    <div
      className={cn("flex flex-col gap-6", (tab === "saved" || tab === "recent") && "lg:h-full")}
    >
      <h1 className="sr-only">Activities</h1>
      <SegmentedTabs
        className="max-w-3xl"
        tabs={TABS.map((t) => ({
          label: t.label,
          href: `/activities?tab=${t.id}`,
          active: t.id === tab,
        }))}
      />
      {tab === "saved" && <SavedJobs initial={await serverApi<JobSummary[]>("/me/saved-jobs")} />}
      {tab === "recent" && (
        <JobBrowser
          jobs={await serverApi<JobSummary[]>("/me/recent-jobs")}
          emptyMessage={
            <>
              Jobs you open show up here.{" "}
              <Link href="/explore/jobs" className="text-link underline">
                Start exploring
              </Link>
              .
            </>
          }
        />
      )}
      {tab === "alerts" && (
        <EmptyState title="Job alerts aren't available yet">
          Until then,{" "}
          <Link href="/explore/jobs?tab=search" className="text-link underline">
            search jobs
          </Link>{" "}
          and save the ones you like, or check <strong>For you</strong> for new matches.
        </EmptyState>
      )}
      {tab === "applications" && (
        <MyApplicationsView initial={await serverApi<MyApplications>("/me/applications")} />
      )}
    </div>
  );
}
