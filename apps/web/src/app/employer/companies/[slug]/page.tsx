import type { Metadata } from "next";
import { CompanyProfileView, loadCompany } from "@/components/company/CompanyProfileView";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  return { title: (await loadCompany((await params).slug)).name };
}

export default async function EmployerCompanyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return <CompanyProfileView slug={(await params).slug} jobHrefBase="/employer/jobs" />;
}
