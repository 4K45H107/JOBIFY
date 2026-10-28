import type { Metadata } from "next";
import type { SeekerProfile } from "@jobify/shared";
import { pickSection, SEEKER_SECTIONS } from "@/components/profile/sections";
import { SeekerSettings } from "@/components/profile/SeekerSettings";
import { serverApi } from "@/lib/api/server";

export const metadata: Metadata = { title: "Profile" };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  const active = pickSection(SEEKER_SECTIONS, (await searchParams).section);
  const profile = await serverApi<SeekerProfile>("/me/profile");
  return <SeekerSettings key={active} initial={profile} section={active} />;
}
