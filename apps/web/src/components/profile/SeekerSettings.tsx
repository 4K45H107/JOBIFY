"use client";

import { type EmailPreference, type SeekerProfile, UPLOAD_LIMITS } from "@jobify/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { FileButton } from "@/components/ui/FileButton";
import { AccountSection } from "./AccountSection";
import { EmailPreferencesSection } from "./EmailPreferencesSection";
import { SeekerCvSection } from "./SeekerCvSection";
import { SeekerInfoSection } from "./SeekerInfoSection";
import { SeekerPreferencesSection } from "./SeekerPreferencesSection";
import { SEEKER_SECTIONS, type SeekerSectionId } from "./sections";
import { SettingsLayout } from "./SettingsLayout";

export function SeekerSettings({
  initial,
  section,
  emailPreferences,
  emailVerified,
  hasPassword,
}: {
  initial: SeekerProfile;
  section: SeekerSectionId;
  emailVerified: boolean;
  hasPassword: boolean;
  /** Loaded by the page only for the email section. */
  emailPreferences?: EmailPreference[];
}) {
  const router = useRouter();
  const [profile, setProfile] = useState(initial);
  const onSaved = (next: SeekerProfile) => {
    setProfile(next);
    // Refresh server components too (e.g. the top bar avatar and name).
    router.refresh();
  };

  return (
    <SettingsLayout
      name={profile.fullName}
      email={profile.email}
      photoUrl={profile.photoUrl}
      photoAction={
        <FileButton
          endpoint="/me/photo"
          accept={UPLOAD_LIMITS.image.types}
          maxBytes={UPLOAD_LIMITS.image.maxBytes}
          onUploaded={onSaved}
          variant="outline"
          size="sm"
        >
          {profile.photoUrl ? "Change photo" : "Add photo"}
        </FileButton>
      }
      sections={[...SEEKER_SECTIONS]}
      active={section}
      basePath="/settings"
    >
      {section === "dashboard" && (
        <DashboardSection
          emptyHint={
            <>
              Nothing here yet.{" "}
              <Link href="/explore/jobs" className="text-link underline">
                Find a job to apply for
              </Link>
              .
            </>
          }
        />
      )}
      {section === "info" && <SeekerInfoSection profile={profile} onSaved={onSaved} />}
      {section === "cv" && <SeekerCvSection profile={profile} onSaved={onSaved} />}
      {section === "preferences" && (
        <SeekerPreferencesSection profile={profile} onSaved={onSaved} />
      )}
      {section === "email" && emailPreferences && (
        <EmailPreferencesSection initial={emailPreferences} />
      )}
      {section === "account" && (
        <AccountSection
          email={profile.email}
          accountType="Job seeker"
          emailVerified={emailVerified}
          hasPassword={hasPassword}
        />
      )}
    </SettingsLayout>
  );
}
