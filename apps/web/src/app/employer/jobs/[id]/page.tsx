import type { Metadata } from "next";
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
      <Card className="h-fit">
        <CardHeader title="Applicants" description={`${job.applicants} so far`} />
        <p className="text-sm text-fg-subtle">
          Reviewing applicants (CVs, test scores, shortlisting) arrives with the Job Management
          screen in Phase 3.
        </p>
      </Card>
    </div>
  );
}
