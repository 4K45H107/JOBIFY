import { MobileNav } from "./MobileNav";
import type { NavItem } from "./nav";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

/** Signed-in layout shared by the seeker and employer areas. */
export function AppShell({
  nav,
  homeHref,
  children,
}: {
  nav: NavItem[];
  homeHref: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-dvh flex-col">
      <TopBar homeHref={homeHref} />
      <div className="flex min-h-0 flex-1">
        <Sidebar items={nav} />
        <main className="min-w-0 flex-1 overflow-y-auto px-4 py-6 md:px-10 md:py-8">
          {children}
        </main>
      </div>
      <MobileNav items={nav} />
    </div>
  );
}
