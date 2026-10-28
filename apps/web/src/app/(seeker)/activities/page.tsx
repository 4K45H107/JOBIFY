import type { Metadata } from "next";
import Link from "next/link";
import type { JobSummary } from "@jobify/shared";
import { SavedJobs } from "@/components/activities/SavedJobs";
import { JobBrowser } from "@/components/jobs/JobBrowser";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { serverApi } from "@/lib/api/server";

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
    <div className="flex flex-col gap-6">
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
        <ComingSoon title="Job alerts" figmaFrame="Activities - Job Alerts" phase="Phase 5" />
      )}
      {tab === "applications" && (
        <ComingSoon title="Applications" figmaFrame="Activities - Applications" phase="Phase 3" />
      )}
    </div>
  );
}
