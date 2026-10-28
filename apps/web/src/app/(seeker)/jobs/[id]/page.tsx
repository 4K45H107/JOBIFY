import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { JobDetail, JobSummary } from "@jobify/shared";
import { JobCardList } from "@/components/jobs/JobCardList";
import { JobDetailPanel } from "@/components/jobs/JobDetailPanel";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ApiError } from "@/lib/api/errors";
import { serverApi } from "@/lib/api/server";

async function loadJob(id: string): Promise<JobDetail> {
  try {
    return await serverApi<JobDetail>(`/jobs/${id}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const job = await loadJob((await params).id);
  return { title: `${job.title} at ${job.company.name}` };
}

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [job, similar] = await Promise.all([
    loadJob(id),
    serverApi<JobSummary[]>(`/jobs/${id}/similar`),
  ]);
  return (
    <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <JobDetailPanel job={job} collapsible={false} />
      <aside aria-labelledby="similar">
        <SectionHeading id="similar" className="mb-2 text-xl">
          Similar jobs
        </SectionHeading>
        <JobCardList jobs={similar} emptyMessage="No similar jobs right now." />
      </aside>
    </div>
  );
}
