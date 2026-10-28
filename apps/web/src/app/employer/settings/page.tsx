import type { Metadata } from "next";
import type { EmployerProfile } from "@jobify/shared";
import { EmployerSettings } from "@/components/profile/EmployerSettings";
import { EMPLOYER_SECTIONS, pickSection } from "@/components/profile/sections";
import { getCurrentUser, serverApi } from "@/lib/api/server";

export const metadata: Metadata = { title: "Profile" };

export default async function EmployerSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  const active = pickSection(EMPLOYER_SECTIONS, (await searchParams).section);
  const [profile, user] = await Promise.all([
    serverApi<EmployerProfile>("/me/employer-profile"),
    getCurrentUser(),
  ]);
  const company = user?.company?.status === "ACTIVE" ? user.company.name : null;
  return <EmployerSettings key={active} initial={profile} section={active} companyName={company} />;
}
