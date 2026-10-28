import type { Metadata } from "next";
import { CompanyDirectory } from "@/components/company/CompanyDirectory";

export const metadata: Metadata = { title: "Explore companies" };

export default async function ExploreCompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q = "", page = "1" } = await searchParams;
  return (
    <CompanyDirectory q={q} page={page} basePath="/explore/companies" profileBase="/companies" />
  );
}
