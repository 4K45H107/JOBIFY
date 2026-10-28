import type { Metadata } from "next";
import { type Applicant, applicantsQuerySchema } from "@jobify/shared";
import { ApplicantsBoard } from "@/components/hiring/ApplicantsBoard";
import { serverApi } from "@/lib/api/server";
import { loadOwnJob } from "../../load-job";

export const metadata: Metadata = { title: "Applicants" };

export default async function ApplicantsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  const query = applicantsQuerySchema.safeParse(await searchParams);
  const { sort, stage } = query.success ? query.data : applicantsQuerySchema.parse({});
  const job = await loadOwnJob(id);
  const qs = new URLSearchParams({ sort, ...(stage && { stage }) });
  const applicants = await serverApi<Applicant[]>(`/jobs/${id}/applications?${qs}`);
  return (
    <ApplicantsBoard
      key={qs.toString()}
      jobId={id}
      jobTitle={job.title}
      applicants={applicants}
      sort={sort}
      stage={stage ?? null}
      hasTest={job.hasAssessment}
    />
  );
}
