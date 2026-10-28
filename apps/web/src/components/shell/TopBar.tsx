import Image from "next/image";
import Link from "next/link";
import type { AuthUser } from "@jobify/shared";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { AccountMenu } from "./AccountMenu";

/** Figma top bar: black, rounded bottom corners, logo left; search, notifications and avatar right. */
export function TopBar({ homeHref, user }: { homeHref: string; user: AuthUser }) {
  const searchHref = user.role === "EMPLOYER" ? "/employer/explore" : "/explore/jobs?tab=search";
  return (
    <header className="flex h-16 shrink-0 items-center justify-between rounded-b-2xl bg-chrome px-4 text-chrome-fg md:h-[104px] md:rounded-b-[20px] md:px-5">
      <Link href={homeHref} className="font-brand text-3xl leading-none md:text-[40px]">
        Jobify.
      </Link>

      <div className="flex items-center gap-5 md:gap-9">
        {/* Global search (jobs + companies) comes later; until then this opens the main search page. */}
        <Link
          href={searchHref}
          className="flex items-center gap-3 rounded-full px-2 py-1 transition-opacity hover:opacity-80"
        >
          <Image src="/icons/search-white.svg" alt="" width={21} height={17} />
          <span className="hidden text-2xl md:inline">Search</span>
          <span className="sr-only md:hidden">Search</span>
        </Link>
        <NotificationBell
          allHref={user.role === "EMPLOYER" ? "/employer/notifications" : "/notifications"}
        />
        <AccountMenu user={user} />
      </div>
    </header>
  );
}
