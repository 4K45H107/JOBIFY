"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { passwordSchema } from "@jobify/shared";
import { z } from "zod";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { PasswordField } from "@/components/ui/PasswordField";
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
  hasPassword,
}: {
  email: string;
  accountType: string;
  emailVerified: boolean;
  /** False for accounts created with Google. */
  hasPassword: boolean;
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
      {hasPassword ? <ChangePasswordCard /> : <SetPasswordCard email={email} />}
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

/** Google-only accounts: a password is set through the emailed reset link. */
function SetPasswordCard({ email }: { email: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | { error: string }>("idle");
  const send = async () => {
    setState("sending");
    try {
      await api("/auth/password/forgot", { method: "POST", json: { email } });
      setState("sent");
    } catch (error) {
      setState({ error: errorMessage(error) });
    }
  };
  return (
    <Card>
      <CardHeader
        title="Password"
        description="You sign in with Google. Add a password to also sign in with your email."
      />
      {state === "sent" ? (
        <p role="status" className="rounded-[10px] bg-success/15 px-4 py-3 text-sm">
          We emailed you a link to set a password. It works for an hour.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {typeof state === "object" && <Alert>{state.error}</Alert>}
          <Button onClick={send} disabled={state === "sending"} className="self-start">
            {state === "sending" ? "Sending…" : "Email me a link to set a password"}
          </Button>
        </div>
      )}
    </Card>
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
        <PasswordField
          label="Current password"
          autoComplete="current-password"
          error={errors.currentPassword?.message}
          {...register("currentPassword")}
        />
        <PasswordField
          label="New password"
          autoComplete="new-password"
          hint="At least 8 characters, with a letter and a number."
          error={errors.newPassword?.message}
          {...register("newPassword")}
        />
        <PasswordField
          label="Confirm new password"
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
