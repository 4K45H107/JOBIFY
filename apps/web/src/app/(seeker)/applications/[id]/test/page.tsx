import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Attempt, MyApplication } from "@jobify/shared";
import { McqExam } from "@/components/apply/McqExam";
import { ApiError } from "@/lib/api/errors";
import { serverApi } from "@/lib/api/server";

export const metadata: Metadata = { title: "Skill test" };

export default async function TestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let application: MyApplication;
  try {
    application = await serverApi<MyApplication>(`/me/applications/${id}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
  if (application.test.state === null) notFound();

  // Resume (or show the result of) an attempt that already exists; a new one starts only on "Start test".
  const attempt =
    application.test.state === "NOT_STARTED"
      ? null
      : await serverApi<Attempt>(`/me/applications/${id}/attempt`, { method: "POST" });
  return <McqExam applicationId={id} jobTitle={application.job.title} initial={attempt} />;
}
