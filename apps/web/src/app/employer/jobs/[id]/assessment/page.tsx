import type { Metadata } from "next";
import type { Applicant, CodingProblemList, TeamAssessment } from "@jobify/shared";
import { CodingTestSetup } from "@/components/hiring/CodingTestSetup";
import { McqBuilder } from "@/components/hiring/McqBuilder";
import { ApiError } from "@/lib/api/errors";
import { serverApi } from "@/lib/api/server";
import { loadOwnJob } from "../../load-job";

export const metadata: Metadata = { title: "Skill test" };

/**
 * The job's skill test: the coding problem picker or the multiple-choice builder. It shows the
 * job's current kind; ?kind= picks the other one (saving it replaces the current test).
 */
export default async function AssessmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; kind?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const job = await loadOwnJob(id);
  let assessment: TeamAssessment | null = null;
  try {
    assessment = await serverApi<TeamAssessment>(`/jobs/${id}/assessment`);
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 404)) throw error;
  }

  const kind =
    query.kind === "coding" ? "CODING" : query.kind === "mcq" ? "MCQ" : (assessment?.kind ?? "MCQ");
  if (kind === "CODING") {
    const library = await serverApi<CodingProblemList>("/coding-problems");
    return (
      <CodingTestSetup jobId={id} jobTitle={job.title} initial={assessment} library={library} />
    );
  }

  const tab = query.tab === "responses" ? "responses" : "questions";
  const replacing = assessment?.kind === "CODING";
  const responses =
    tab === "responses" ? await serverApi<Applicant[]>(`/jobs/${id}/applications?sort=score`) : [];
  return (
    <McqBuilder
      key={tab}
      jobId={id}
      jobTitle={job.title}
      initial={replacing ? null : assessment}
      replaces={replacing && !assessment?.locked ? "coding test" : undefined}
      responses={responses}
      tab={tab}
    />
  );
}
