import type { Metadata } from "next";
import { Suspense } from "react";
import { googleSignInEnabled } from "@/lib/api/providers";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  const google = await googleSignInEnabled();
  return (
    <Suspense>
      <LoginForm google={google} />
    </Suspense>
  );
}
