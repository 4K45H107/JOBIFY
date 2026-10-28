import { notFound } from "next/navigation";
import type { JobDetail } from "@jobify/shared";
import { ApiError } from "@/lib/api/errors";
import { serverApi } from "@/lib/api/server";

/** A job the employer's company owns; anything else is a 404 in the employer area. */
export async function loadOwnJob(id: string): Promise<JobDetail> {
  try {
    const job = await serverApi<JobDetail>(`/jobs/${id}`);
    if (!job.canManage) notFound();
    return job;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
}
