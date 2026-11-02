import Link from "next/link";
import type { AuthUser } from "@jobify/shared";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { AccountMenu } from "./AccountMenu";
import { HeaderSearch } from "./HeaderSearch";

/** Figma top bar: black, logo left; search, notifications and avatar right. */
export function TopBar({ homeHref, user }: { homeHref: string; user: AuthUser }) {
  // Employers still setting up a company can't open jobs or company pages yet.
  const canSearch =
    user.role === "SEEKER" || (user.role === "EMPLOYER" && user.company?.status === "ACTIVE");
  return (
    <header className="flex h-14 shrink-0 items-center justify-between bg-chrome px-4 text-chrome-fg md:h-[72px] md:px-6">
      <Link href={homeHref} className="font-brand text-2xl leading-none md:text-[32px]">
        Jobify.
      </Link>

      <div className="flex items-center gap-5 md:gap-7">
        {canSearch && <HeaderSearch role={user.role === "EMPLOYER" ? "EMPLOYER" : "SEEKER"} />}
        <NotificationBell
          allHref={user.role === "EMPLOYER" ? "/employer/notifications" : "/notifications"}
        />
        <AccountMenu user={user} />
      </div>
    </header>
  );
}
