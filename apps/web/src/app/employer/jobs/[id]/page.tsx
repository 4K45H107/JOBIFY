import type { Metadata } from "next";
import Link from "next/link";
import { EmployerJobActions } from "@/components/jobs/EmployerJobActions";
import { JobDetailPanel } from "@/components/jobs/JobDetailPanel";
import { Card, CardHeader } from "@/components/ui/Card";
import { loadOwnJob } from "../load-job";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  return { title: (await loadOwnJob((await params).id)).title };
}

export default async function EmployerJobPage({ params }: { params: Promise<{ id: string }> }) {
  const job = await loadOwnJob((await params).id);
  return (
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <JobDetailPanel
        job={job}
        collapsible={false}
        actions={<EmployerJobActions job={job} />}
        companyHref="/employer/company"
        fullPageHref={null}
      />
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader title="Applicants" description={`${job.applicants} so far`} />
          <Link
            href={`/employer/jobs/${job.id}/applicants`}
            className="inline-flex h-10 items-center rounded-full bg-primary px-6 font-medium tracking-label text-primary-fg uppercase"
          >
            Review applicants
          </Link>
        </Card>
        <Card>
          <CardHeader
            title="Skill test"
            description={
              job.hasAssessment
                ? "New applicants take an MCQ test."
                : "Add an MCQ test new applicants take after applying."
            }
          />
          <Link
            href={`/employer/jobs/${job.id}/assessment`}
            className="inline-flex h-10 items-center rounded-[10px] border border-outline px-5 font-medium tracking-label uppercase hover:bg-surface-grey"
          >
            {job.hasAssessment ? "Manage test" : "Add skill test +"}
          </Link>
        </Card>
      </div>
    </div>
  );
}
