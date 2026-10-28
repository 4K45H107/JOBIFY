import type { Metadata } from "next";
import Link from "next/link";
import type { JobList } from "@jobify/shared";
import { JobBrowser } from "@/components/jobs/JobBrowser";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { serverApi } from "@/lib/api/server";

export const metadata: Metadata = { title: "Employer home" };

/** Figma "Employer Home": My Company Jobs / My Offerings, master–detail. */
export default async function EmployerHomePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const scope = (await searchParams).tab === "mine" ? "mine" : "company";
  const jobs = await serverApi<JobList>(`/employer/jobs?scope=${scope}&pageSize=50`);

  return (
    <div className="flex flex-col gap-6">
      <SegmentedTabs
        tabs={[
          { label: "My Company Jobs", href: "/employer", active: scope === "company" },
          { label: "My Offerings", href: "/employer?tab=mine", active: scope === "mine" },
        ]}
      />
      <JobBrowser
        key={scope}
        employer
        jobs={jobs.items}
        emptyMessage={
          <>
            {scope === "mine"
              ? "You haven't posted any jobs yet."
              : "Your company hasn't posted any jobs yet."}{" "}
            <Link href="/employer/jobs/new" className="text-link underline">
              Add a job
            </Link>
            .
          </>
        }
      />
    </div>
  );
}
