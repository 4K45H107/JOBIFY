import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { PillTabs } from "@/components/ui/SegmentedTabs";

export const metadata: Metadata = { title: "Explore jobs" };

export default async function ExploreJobsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const active = tab === "search" ? "search" : "for-you";

  return (
    <div className="flex flex-col gap-6">
      <PillTabs
        tabs={[
          { label: "For You", href: "/explore/jobs", active: active === "for-you" },
          { label: "Search", href: "/explore/jobs?tab=search", active: active === "search" },
        ]}
      />
      <ComingSoon
        title={active === "search" ? "Search jobs" : "Jobs for you"}
        figmaFrame={active === "search" ? "Explore - Jobs - Search" : "Explore - Jobs - For You"}
        phase="Phase 2"
      />
    </div>
  );
}
