import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/AppShell";
import { employerNav, employerOnboardingNav } from "@/components/shell/nav";
import { getCurrentUser } from "@/lib/api/server";
import { employerCompanyRedirect, PATHNAME_HEADER } from "@/lib/auth/routing";

export default async function EmployerLayout({ children }: { children: React.ReactNode }) {
  // The middleware already routes by role; this guards against a token the API rejects.
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const pathname = (await headers()).get(PATHNAME_HEADER) ?? "/employer";
  const status = user.company?.status ?? null;
  const target = employerCompanyRedirect(pathname, status);
  if (target) redirect(target);
  const hasCompany = status === "ACTIVE";

  return (
    <AppShell
      nav={hasCompany ? employerNav : employerOnboardingNav}
      homeHref={hasCompany ? "/employer" : "/employer/onboarding"}
      user={user}
    >
      {children}
    </AppShell>
  );
}
