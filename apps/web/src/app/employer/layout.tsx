import { AppShell } from "@/components/shell/AppShell";
import { employerNav } from "@/components/shell/nav";

export default function EmployerLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell nav={employerNav} homeHref="/employer">
      {children}
    </AppShell>
  );
}
