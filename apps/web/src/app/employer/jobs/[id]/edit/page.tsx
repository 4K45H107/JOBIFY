import type { Metadata } from "next";
import { JobForm } from "@/components/jobs/JobForm";
import { loadOwnJob } from "../../load-job";

export const metadata: Metadata = { title: "Edit job" };

export default async function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const job = await loadOwnJob((await params).id);
  return <JobForm job={job} companyName={job.company.name} companyLogo={job.company.logoUrl} />;
}
