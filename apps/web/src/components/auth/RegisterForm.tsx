"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { type AuthUser, registerSchema, type RegisterInput, type SignupRole } from "@jobify/shared";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { cn } from "@/lib/cn";
import { useAuthRedirect } from "./useAuthRedirect";

const ROLES: { value: SignupRole; title: string; description: string }[] = [
  {
    value: "SEEKER",
    title: "I'm looking for a job",
    description: "Find jobs, apply and interview",
  },
  { value: "EMPLOYER", title: "I'm hiring", description: "Post jobs and review applicants" },
];

export function RegisterForm() {
  const redirect = useAuthRedirect();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: "SEEKER" },
  });
  const role = watch("role");

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      redirect(await api<AuthUser>("/auth/register", { method: "POST", json: values }));
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setError("email", { message: "An account with this email already exists" });
      } else if (error instanceof ApiError && error.status === 429) {
        setFormError("Too many attempts. Wait a minute and try again.");
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-medium">Create your account</h1>
        <p className="text-fg-subtle">It takes less than a minute.</p>
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
      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...register("email")}
      />
      <TextField
        label="Password"
        type="password"
        autoComplete="new-password"
        hint="At least 8 characters, with a letter and a number."
        error={errors.password?.message}
        {...register("password")}
      />

      <Button type="submit" disabled={isSubmitting} className="mt-2 w-full">
        {isSubmitting ? "Creating account…" : "Create account"}
      </Button>

      <p className="text-center text-sm text-fg-subtle">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-link hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
