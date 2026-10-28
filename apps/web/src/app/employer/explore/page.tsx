import type { Metadata } from "next";
import { CompanyDirectory } from "@/components/company/CompanyDirectory";

export const metadata: Metadata = { title: "Explore companies" };

export default async function EmployerExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q = "", page = "1" } = await searchParams;
  return (
    <CompanyDirectory
      q={q}
      page={page}
      basePath="/employer/explore"
      profileBase="/employer/companies"
    />
  );
}
