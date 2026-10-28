import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/AppShell";
import { employerNav } from "@/components/shell/nav";
import { getCurrentUser } from "@/lib/api/server";

export default async function EmployerLayout({ children }: { children: React.ReactNode }) {
  // The middleware already routes by role; this guards against a token the API rejects.
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <AppShell nav={employerNav} homeHref="/employer" user={user}>
      {children}
    </AppShell>
  );
}
