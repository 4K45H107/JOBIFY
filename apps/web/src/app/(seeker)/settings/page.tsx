import type { Metadata } from "next";
import type { EmailPreferences, SeekerProfile } from "@jobify/shared";
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
  const [profile, email] = await Promise.all([
    serverApi<SeekerProfile>("/me/profile"),
    active === "email" ? serverApi<EmailPreferences>("/me/email-preferences") : null,
  ]);
  return (
    <SeekerSettings
      key={active}
      initial={profile}
      section={active}
      emailPreferences={email?.preferences}
    />
  );
}
