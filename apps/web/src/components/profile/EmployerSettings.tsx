"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  type EmployerProfile,
  type EmployerProfileUpdate,
  employerProfileUpdateSchema,
  UPLOAD_LIMITS,
} from "@jobify/shared";
import { z } from "zod";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { FileButton } from "@/components/ui/FileButton";
import { TextField } from "@/components/ui/TextField";
import { api } from "@/lib/api/client";
import { EMPLOYER_SECTIONS, type EmployerSectionId } from "./sections";
import { SettingsLayout } from "./SettingsLayout";

type FormInput = z.input<typeof employerProfileUpdateSchema>;

const toForm = (p: EmployerProfile): FormInput => ({
  fullName: p.fullName,
  designation: p.designation ?? "",
  phone: p.phone ?? "",
});

export function EmployerSettings({
  initial,
  section,
  companyName,
}: {
  initial: EmployerProfile;
  section: EmployerSectionId;
  companyName: string | null;
}) {
  const router = useRouter();
  const [profile, setProfile] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, EmployerProfileUpdate>({
    resolver: zodResolver(employerProfileUpdateSchema),
    defaultValues: toForm(initial),
  });

  const onSaved = (next: EmployerProfile) => {
    setProfile(next);
    router.refresh();
  };

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      const saved = await api<EmployerProfile>("/me/employer-profile", {
        method: "PATCH",
        json: values,
      });
      onSaved(saved);
      reset(toForm(saved));
      setEditing(false);
    } catch {
      setError("Couldn't save your profile. Please try again.");
    }
  });

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
      sections={[...EMPLOYER_SECTIONS]}
      active={section}
      basePath="/employer/settings"
    >
      {section === "info" ? (
        <Card>
          <CardHeader
            title="My information"
            action={
              !editing && (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-2 rounded-[8px] px-2 py-1 text-sm hover:bg-surface-grey"
                >
                  <Image
                    src="/icons/edit-info.png"
                    alt=""
                    width={28}
                    height={28}
                    className="icon-themed"
                  />
                  Edit
                </button>
              )
            }
          />
          {!editing ? (
            <dl className="grid gap-x-10 gap-y-5 sm:grid-cols-2">
              {(
                [
                  ["Full name", profile.fullName],
                  ["Designation", profile.designation],
                  ["Company", companyName],
                  ["Phone", profile.phone],
                ] as const
              ).map(([label, value]) => (
                <div key={label}>
                  <dt className="text-lg">{label}:</dt>
                  <dd className={value ? "text-lg text-fg-muted" : "text-fg-subtle italic"}>
                    {value ?? "Not added"}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
              {error && <Alert className="sm:col-span-2">{error}</Alert>}
              <TextField
                label="Full name"
                error={errors.fullName?.message}
                {...register("fullName")}
              />
              <TextField
                label="Designation"
                placeholder="e.g. Head of Talent"
                {...register("designation")}
              />
              <TextField label="Phone" type="tel" {...register("phone")} />
              <div className="flex gap-3 sm:col-span-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving…" : "Save"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    reset(toForm(profile));
                    setEditing(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </Card>
      ) : (
        <Card>
          <CardHeader title="Account settings" />
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-fg-subtle">Email</dt>
              <dd className="text-lg">{profile.email}</dd>
            </div>
            <div>
              <dt className="text-sm text-fg-subtle">Account type</dt>
              <dd className="text-lg">Employer</dd>
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
