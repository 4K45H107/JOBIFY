import type { Metadata } from "next";
import { Suspense } from "react";
import { SigningIn } from "@/components/auth/SigningIn";

export const metadata: Metadata = { title: "Signing in" };

export default function SigningInPage() {
  return (
    <Suspense>
      <SigningIn />
    </Suspense>
  );
}
