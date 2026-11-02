import type { Metadata } from "next";
import { Suspense } from "react";
import { googleSignInEnabled } from "@/lib/api/providers";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage() {
  const google = await googleSignInEnabled();
  return (
    <Suspense>
      <RegisterForm google={google} />
    </Suspense>
  );
}
