import type { Metadata } from "next";
import type { Applicant, TeamAssessment } from "@jobify/shared";
import { McqBuilder } from "@/components/hiring/McqBuilder";
import { ApiError } from "@/lib/api/errors";
import { serverApi } from "@/lib/api/server";
import { loadOwnJob } from "../../load-job";

export const metadata: Metadata = { title: "Skill test" };

export default async function AssessmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const tab = (await searchParams).tab === "responses" ? "responses" : "questions";
  const job = await loadOwnJob(id);
  let assessment: TeamAssessment | null = null;
  try {
    assessment = await serverApi<TeamAssessment>(`/jobs/${id}/assessment`);
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 404)) throw error;
  }
  const responses =
    tab === "responses" ? await serverApi<Applicant[]>(`/jobs/${id}/applications?sort=score`) : [];
  return (
    <McqBuilder
      key={tab}
      jobId={id}
      jobTitle={job.title}
      initial={assessment}
      responses={responses}
      tab={tab}
    />
  );
}
