"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { type AuthUser, loginSchema, type LoginInput } from "@jobify/shared";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { useAuthRedirect } from "./useAuthRedirect";

export function LoginForm() {
  const redirect = useAuthRedirect();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      redirect(await api<AuthUser>("/auth/login", { method: "POST", json: values }));
    } catch (error) {
      setFormError(
        error instanceof ApiError && error.status === 429
          ? "Too many attempts. Wait a minute and try again."
          : error instanceof ApiError && error.status === 401
            ? "Incorrect email or password."
            : "Something went wrong. Please try again.",
      );
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-medium">Welcome back</h1>
        <p className="text-fg-subtle">Sign in to continue to Jobify.</p>
      </header>

      {formError && <Alert>{formError}</Alert>}

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
        autoComplete="current-password"
        error={errors.password?.message}
        {...register("password")}
      />

      <Button type="submit" disabled={isSubmitting} className="mt-2 w-full">
        {isSubmitting ? "Signing in…" : "Sign in"}
      </Button>

      <p className="text-center text-sm text-fg-subtle">
        New to Jobify?{" "}
        <Link href="/register" className="font-medium text-link hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}
