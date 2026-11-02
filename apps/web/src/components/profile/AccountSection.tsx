"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { passwordSchema } from "@jobify/shared";
import { z } from "zod";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { TextField } from "@/components/ui/TextField";
import { api } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/messages";

const changeSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: passwordSchema,
    confirm: z.string(),
  })
  .refine((v) => v.newPassword === v.confirm, {
    message: "The passwords don't match",
    path: ["confirm"],
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    message: "Choose a password different from the current one",
    path: ["newPassword"],
  });
type ChangeValues = z.infer<typeof changeSchema>;

/** Settings › Account settings, for seekers and employers. */
export function AccountSection({
  email,
  accountType,
  emailVerified,
}: {
  email: string;
  accountType: string;
  emailVerified: boolean;
}) {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader title="Account settings" />
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-fg-subtle">Email</dt>
            <dd className="text-lg break-all">{email}</dd>
            <dd className="mt-1">
              <VerificationStatus verified={emailVerified} />
            </dd>
          </div>
          <div>
            <dt className="text-sm text-fg-subtle">Account type</dt>
            <dd className="text-lg">{accountType}</dd>
          </div>
        </dl>
      </Card>
      <ChangePasswordCard />
    </div>
  );
}

function VerificationStatus({ verified }: { verified: boolean }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | { error: string }>("idle");
  if (verified) return <span className="text-sm font-medium text-success">✓ Verified</span>;

  const resend = async () => {
    setState("sending");
    try {
      await api("/auth/email/resend", { method: "POST" });
      setState("sent");
    } catch (error) {
      setState({ error: errorMessage(error) });
    }
  };
  return (
    <div className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-heading-accent">
        Not verified: you can&apos;t apply to or post jobs yet.
      </span>
      {state === "sent" ? (
        <span className="text-fg-subtle">Sent. Check your inbox (and spam) for the link.</span>
      ) : (
        <button
          type="button"
          onClick={resend}
          disabled={state === "sending"}
          className="self-start text-link underline disabled:opacity-60"
        >
          {state === "sending" ? "Sending…" : "Send a new verification link"}
        </button>
      )}
      {typeof state === "object" && <span className="text-heading-accent">{state.error}</span>}
    </div>
  );
}

function ChangePasswordCard() {
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangeValues>({ resolver: zodResolver(changeSchema) });

  const onSubmit = handleSubmit(async ({ currentPassword, newPassword }) => {
    setMessage(null);
    try {
      await api("/auth/password/change", {
        method: "POST",
        json: { currentPassword, newPassword },
      });
      reset();
      setMessage({
        ok: true,
        text: "Password changed. Your other devices are signed out within 15 minutes, and we emailed you a notice.",
      });
    } catch (error) {
      setMessage({ ok: false, text: errorMessage(error) });
    }
  });

  return (
    <Card>
      <CardHeader
        title="Change password"
        description="You stay signed in here; other devices are signed out within 15 minutes."
      />
      <form onSubmit={onSubmit} noValidate className="flex max-w-md flex-col gap-4">
        {message &&
          (message.ok ? (
            <p role="status" className="rounded-[10px] bg-success/15 px-4 py-3 text-sm">
              {message.text}
            </p>
          ) : (
            <Alert>{message.text}</Alert>
          ))}
        <TextField
          label="Current password"
          type="password"
          autoComplete="current-password"
          error={errors.currentPassword?.message}
          {...register("currentPassword")}
        />
        <TextField
          label="New password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters, with a letter and a number."
          error={errors.newPassword?.message}
          {...register("newPassword")}
        />
        <TextField
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          error={errors.confirm?.message}
          {...register("confirm")}
        />
        <Button type="submit" disabled={isSubmitting} className="self-start">
          {isSubmitting ? "Saving…" : "Change password"}
        </Button>
      </form>
    </Card>
  );
}
