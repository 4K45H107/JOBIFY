import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { JobDetail, SeekerProfile } from "@jobify/shared";
import { EasyApplyWizard } from "@/components/apply/EasyApplyWizard";
import { Card } from "@/components/ui/Card";
import { ApiError } from "@/lib/api/errors";
import { serverApi } from "@/lib/api/server";

export const metadata: Metadata = { title: "Easy Apply" };

export default async function ApplyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let job: JobDetail;
  try {
    job = await serverApi<JobDetail>(`/jobs/${id}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  const closed =
    job.status !== "OPEN" ||
    (job.deadline !== null && job.deadline < new Date().toISOString().slice(0, 10));
  if (job.applied || closed) {
    return (
      <Card className="mx-auto max-w-xl text-center">
        <h1 className="text-2xl font-medium">
          {job.applied ? "You've already applied" : "Applications are closed"}
        </h1>
        <p className="mt-2 text-fg-muted">
          {job.title} at {job.company.name}
        </p>
        <Link
          href={job.applied ? "/activities?tab=applications" : "/explore/jobs"}
          className="mt-6 inline-block text-link underline"
        >
          {job.applied ? "See your applications" : "Find other jobs"}
        </Link>
      </Card>
    );
  }

  const profile = await serverApi<SeekerProfile>("/me/profile");
  return <EasyApplyWizard job={job} profile={profile} />;
}
