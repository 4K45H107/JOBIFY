import type { Metadata } from "next";
import { Suspense } from "react";
import { GoogleSignupForm } from "@/components/auth/GoogleSignupForm";

export const metadata: Metadata = { title: "Join with Google" };

export default function GoogleSignupPage() {
  return (
    <Suspense>
      <GoogleSignupForm />
    </Suspense>
  );
}
