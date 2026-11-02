import type { Metadata } from "next";
import { VerifyEmailForm } from "@/components/auth/VerifyEmailForm";

export const metadata: Metadata = { title: "Verify email" };

/** Opened from an emailed link (?token=…). */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  return <VerifyEmailForm token={(await searchParams).token ?? ""} />;
}
