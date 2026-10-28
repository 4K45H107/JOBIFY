import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/AppShell";
import { seekerNav } from "@/components/shell/nav";
import { getCurrentUser } from "@/lib/api/server";

export default async function SeekerLayout({ children }: { children: React.ReactNode }) {
  // The middleware already routes by role; this guards against a token the API rejects.
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <AppShell nav={seekerNav} homeHref="/" user={user}>
      {children}
    </AppShell>
  );
}
