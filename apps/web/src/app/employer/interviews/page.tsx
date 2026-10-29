import type { Metadata } from "next";
import { InterviewList } from "@/components/interviews/InterviewList";
import { loadInterviewsPage } from "@/components/interviews/load-interviews";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";

export const metadata: Metadata = { title: "Interview schedule" };

export default async function EmployerInterviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { scope, interviews, tabs, emptyMessage } = await loadInterviewsPage(
    "EMPLOYER",
    (await searchParams).tab,
  );
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <SegmentedTabs tabs={tabs} />
      <InterviewList
        key={scope}
        initial={interviews}
        viewer="EMPLOYER"
        emptyMessage={emptyMessage}
      />
    </div>
  );
}
