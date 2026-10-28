"use client";

import { type SeekerProfile, UPLOAD_LIMITS } from "@jobify/shared";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { FileButton } from "@/components/ui/FileButton";
import { SeekerCvSection } from "./SeekerCvSection";
import { SeekerInfoSection } from "./SeekerInfoSection";
import { SeekerPreferencesSection } from "./SeekerPreferencesSection";
import { SEEKER_SECTIONS, type SeekerSectionId } from "./sections";
import { SettingsLayout } from "./SettingsLayout";

export function SeekerSettings({
  initial,
  section,
}: {
  initial: SeekerProfile;
  section: SeekerSectionId;
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
      {section === "info" && <SeekerInfoSection profile={profile} onSaved={onSaved} />}
      {section === "cv" && <SeekerCvSection profile={profile} onSaved={onSaved} />}
      {section === "preferences" && (
        <SeekerPreferencesSection profile={profile} onSaved={onSaved} />
      )}
      {section === "account" && (
        <Card>
          <CardHeader title="Account settings" />
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-fg-subtle">Email</dt>
              <dd className="text-lg">{profile.email}</dd>
            </div>
            <div>
              <dt className="text-sm text-fg-subtle">Account type</dt>
              <dd className="text-lg">Job seeker</dd>
            </div>
          </dl>
          <p className="mt-6 text-sm text-fg-subtle">
            Password change and email verification come with the email task.
          </p>
        </Card>
      )}
    </SettingsLayout>
  );
}
