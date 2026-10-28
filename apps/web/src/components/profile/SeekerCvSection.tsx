"use client";

import { type SeekerProfile, UPLOAD_LIMITS } from "@jobify/shared";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { FileButton } from "@/components/ui/FileButton";
import { api } from "@/lib/api/client";

export function SeekerCvSection({
  profile,
  onSaved,
}: {
  profile: SeekerProfile;
  onSaved: (p: SeekerProfile) => void;
}) {
  const [removing, setRemoving] = useState(false);

  const remove = async () => {
    if (!confirm("Remove your CV? Employers won't see it on new applications.")) return;
    setRemoving(true);
    try {
      onSaved(await api<SeekerProfile>("/me/cv", { method: "DELETE" }));
    } finally {
      setRemoving(false);
    }
  };

  return (
    <Card>
      <CardHeader title="CV" description="PDF, up to 5 MB. Employers see it when you apply." />
      <div className="flex flex-wrap items-start gap-3">
        <FileButton
          endpoint="/me/cv"
          accept={UPLOAD_LIMITS.cv.types}
          maxBytes={UPLOAD_LIMITS.cv.maxBytes}
          onUploaded={onSaved}
        >
          {profile.cvUrl ? "Replace CV" : "Upload CV"}
        </FileButton>
        {profile.cvUrl && (
          <>
            <a
              href={profile.cvUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center rounded-[10px] border border-outline px-6 font-medium tracking-label uppercase hover:bg-surface-grey"
            >
              Open
            </a>
            <Button variant="ghost" onClick={remove} disabled={removing}>
              {removing ? "Removing…" : "Remove"}
            </Button>
          </>
        )}
      </div>
      {profile.cvUrl ? (
        <iframe
          title="Your CV"
          src={profile.cvUrl}
          className="mt-6 h-[70vh] w-full rounded-[10px] border border-border bg-surface-grey"
        />
      ) : (
        <p className="mt-6 rounded-[10px] bg-surface-grey p-6 text-center text-fg-subtle">
          You haven&apos;t uploaded a CV yet. Easy Apply needs one.
        </p>
      )}
    </Card>
  );
}
