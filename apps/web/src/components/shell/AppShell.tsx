import type { AuthUser } from "@jobify/shared";
import { MobileNav } from "./MobileNav";
import type { NavItem } from "./nav";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { VerifyEmailBanner } from "./VerifyEmailBanner";

/** Signed-in layout shared by the seeker and employer areas. */
export function AppShell({
  nav,
  homeHref,
  user,
  children,
}: {
  nav: NavItem[];
  homeHref: string;
  user: AuthUser;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-dvh flex-col">
      <a
        href="#main"
        className="sr-only z-50 rounded-[8px] bg-bg px-4 py-2 font-medium text-fg focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to main content
      </a>
      <TopBar homeHref={homeHref} user={user} />
      {!user.emailVerified && <VerifyEmailBanner email={user.email} />}
      <div className="flex min-h-0 flex-1">
        <Sidebar items={nav} />
        {/* relative: absolutely positioned children (e.g. sr-only labels) stay inside the scroll area
            instead of stretching the window, which would scroll the header away. */}
        <main
          id="main"
          tabIndex={-1}
          className="relative min-w-0 flex-1 overflow-y-auto px-4 py-6 md:px-10 md:py-8"
        >
          {children}
        </main>
      </div>
      <MobileNav items={nav} />
    </div>
  );
}
