import type { Metadata } from "next";
import { UnsubscribeForm } from "@/components/auth/UnsubscribeForm";

export const metadata: Metadata = { title: "Unsubscribe" };

/** Linked from every email's footer. Works signed in or not: the token is the proof. */
export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  return <UnsubscribeForm token={(await searchParams).token ?? ""} />;
}
