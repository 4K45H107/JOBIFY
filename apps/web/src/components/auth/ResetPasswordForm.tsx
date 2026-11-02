"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { passwordSchema } from "@jobify/shared";
import { z } from "zod";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { api } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/messages";

const formSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, {
    message: "The passwords don't match",
    path: ["confirm"],
  });
type FormValues = z.infer<typeof formSchema>;

export function ResetPasswordForm({ token }: { token: string }) {
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState<string | null>(
    token ? null : "This reset link is incomplete. Ask for a new one.",
  );
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema) });

  const onSubmit = handleSubmit(async ({ password }) => {
    setFormError(null);
    try {
      await api("/auth/password/reset", { method: "POST", json: { token, password } });
      setDone(true);
    } catch (error) {
      setFormError(errorMessage(error));
    }
  });

  if (done) {
    return (
      <div className="flex flex-col gap-5">
        <h1 className="text-3xl font-medium">Password changed</h1>
        <p className="text-lg">
          Your new password is set. Other browsers and devices are signed out within 15 minutes.
          Sign in with the new password.
        </p>
        <Link
          href="/login"
          className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 font-medium text-primary-fg"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-medium">Choose a new password</h1>
        <p className="text-fg-subtle">At least 8 characters, with a letter and a number.</p>
      </header>
      {formError && (
        <Alert>
          {formError}{" "}
          <Link href="/forgot-password" className="underline">
            Get a new link
          </Link>
        </Alert>
      )}
      <TextField
        label="New password"
        type="password"
        autoComplete="new-password"
        error={errors.password?.message}
        {...register("password")}
      />
      <TextField
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        error={errors.confirm?.message}
        {...register("confirm")}
      />
      <Button type="submit" disabled={isSubmitting || !token} className="mt-2 w-full">
        {isSubmitting ? "Saving…" : "Set new password"}
      </Button>
    </form>
  );
}
