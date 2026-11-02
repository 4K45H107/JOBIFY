"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  type AuthUser,
  type GooglePending,
  googleSignupSchema,
  type GoogleSignupInput,
} from "@jobify/shared";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { api } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/messages";
import { cn } from "@/lib/cn";
import { ROLES } from "./RegisterForm";
import { useAuthRedirect } from "./useAuthRedirect";

/** First Google sign-in from the sign-in page: Google doesn't know if they're hiring. */
export function GoogleSignupForm() {
  const redirect = useAuthRedirect();
  const [pending, setPending] = useState<GooglePending | "expired" | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<GoogleSignupInput>({
    resolver: zodResolver(googleSignupSchema),
    defaultValues: { role: "SEEKER", fullName: "" },
  });
  const role = watch("role");

  useEffect(() => {
    api<GooglePending>("/auth/google/pending")
      .then((p) => {
        setPending(p);
        reset({ role: "SEEKER", fullName: p.fullName });
      })
      .catch(() => setPending("expired"));
  }, [reset]);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      redirect(await api<AuthUser>("/auth/google/complete", { method: "POST", json: values }));
    } catch (error) {
      setFormError(errorMessage(error));
    }
  });

  if (pending === "expired") {
    return (
      <div className="flex flex-col gap-5">
        <h1 className="text-3xl font-medium">Let&apos;s try that again</h1>
        <p className="text-lg">This Google sign-up timed out. Start again from the sign-in page.</p>
        <Link href="/login" className="text-link underline">
          Back to sign in
        </Link>
      </div>
    );
  }
  if (!pending) return <p className="text-fg-subtle">Loading…</p>;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-medium">Welcome to Jobify</h1>
        <p className="text-fg-subtle">
          You&apos;re joining with Google as <strong>{pending.email}</strong>. One last thing:
        </p>
      </header>
      {formError && <Alert>{formError}</Alert>}
      <fieldset className="grid grid-cols-2 gap-3">
        <legend className="sr-only">Account type</legend>
        {ROLES.map((option) => (
          <label
            key={option.value}
            className={cn(
              "flex cursor-pointer flex-col gap-1 rounded-[10px] border p-3 transition",
              role === option.value
                ? "border-outline bg-surface-muted"
                : "border-border hover:bg-surface-grey",
            )}
          >
            <input
              type="radio"
              value={option.value}
              checked={role === option.value}
              onChange={() => setValue("role", option.value)}
              className="sr-only"
            />
            <span className="font-medium">{option.title}</span>
            <span className="text-sm text-fg-subtle">{option.description}</span>
          </label>
        ))}
      </fieldset>
      <TextField
        label="Full name"
        autoComplete="name"
        error={errors.fullName?.message}
        {...register("fullName")}
      />
      <Button type="submit" disabled={isSubmitting} className="mt-2 w-full">
        {isSubmitting ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
