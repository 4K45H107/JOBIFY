"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@jobify/shared";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { api } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/messages";

export function ForgotPasswordForm() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await api("/auth/password/forgot", { method: "POST", json: values });
      setSentTo(values.email);
    } catch (error) {
      setFormError(errorMessage(error));
    }
  });

  if (sentTo) {
    return (
      <div className="flex flex-col gap-5">
        <h1 className="text-3xl font-medium">Check your email</h1>
        {/* Same wording whether or not the account exists: the page mustn't reveal it. */}
        <p className="text-lg">
          If there&apos;s a Jobify account for <strong>{sentTo}</strong>, we&apos;ve sent it a link
          to choose a new password. The link works for an hour.
        </p>
        <p className="text-sm text-fg-subtle">
          Nothing arrived? Check your spam folder, or{" "}
          <button type="button" onClick={() => setSentTo(null)} className="text-link underline">
            try again
          </button>
          .
        </p>
        <Link href="/login" className="text-link underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-medium">Forgot your password?</h1>
        <p className="text-fg-subtle">Enter your email and we&apos;ll send you a reset link.</p>
      </header>
      {formError && <Alert>{formError}</Alert>}
      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...register("email")}
      />
      <Button type="submit" disabled={isSubmitting} className="mt-2 w-full">
        {isSubmitting ? "Sending…" : "Send reset link"}
      </Button>
      <p className="text-center text-sm text-fg-subtle">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-link hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
