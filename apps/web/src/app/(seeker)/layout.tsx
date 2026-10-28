import { AppShell } from "@/components/shell/AppShell";
import { seekerNav } from "@/components/shell/nav";

export default function SeekerLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell nav={seekerNav} homeHref="/">
      {children}
    </AppShell>
  );
}
