import type { Metadata } from "next";
import { Onboarding } from "@/components/company/Onboarding";
import { getCurrentUser } from "@/lib/api/server";

export const metadata: Metadata = { title: "Set up your company" };

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  const pending = user?.company?.status === "PENDING" ? { name: user.company.name } : null;
  return <Onboarding pending={pending} />;
}
