import type { Metadata } from "next";
import type { CompanyDetail } from "@jobify/shared";
import { JobForm } from "@/components/jobs/JobForm";
import { serverApi } from "@/lib/api/server";

export const metadata: Metadata = { title: "Add job" };

export default async function AddJobPage() {
  const company = await serverApi<CompanyDetail>("/companies/mine");
  return <JobForm companyName={company.name} companyLogo={company.logoUrl} />;
}
