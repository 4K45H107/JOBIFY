import type { Metadata } from "next";
import type { CompanyDetail, CompanyMember } from "@jobify/shared";
import { MyCompany } from "@/components/company/MyCompany";
import { getCurrentUser, serverApi } from "@/lib/api/server";

export const metadata: Metadata = { title: "My Company" };

export default async function MyCompanyPage() {
  const user = await getCurrentUser();
  const isAdmin = user?.company?.role === "ADMIN";
  const [company, members] = await Promise.all([
    serverApi<CompanyDetail>("/companies/mine"),
    isAdmin ? serverApi<CompanyMember[]>("/companies/mine/members") : Promise.resolve([]),
  ]);
  return <MyCompany initial={company} isAdmin={isAdmin} initialMembers={members} />;
}
