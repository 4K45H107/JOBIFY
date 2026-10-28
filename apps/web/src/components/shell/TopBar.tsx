import Image from "next/image";
import Link from "next/link";

/** Figma top bar: black, rounded bottom corners, logo left; search, notifications and avatar right. */
export function TopBar({ homeHref }: { homeHref: string }) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between rounded-b-2xl bg-chrome px-4 text-chrome-fg md:h-[104px] md:rounded-b-[20px] md:px-5">
      <Link href={homeHref} className="font-brand text-3xl leading-none md:text-[40px]">
        Jobify.
      </Link>

      <div className="flex items-center gap-5 md:gap-9">
        <button
          type="button"
          className="flex items-center gap-3 rounded-full px-2 py-1 transition-opacity hover:opacity-80"
        >
          <Image src="/icons/search-white.svg" alt="" width={21} height={17} />
          <span className="hidden text-2xl md:inline">Search</span>
          <span className="sr-only md:hidden">Search</span>
        </button>
        <button
          type="button"
          aria-label="Notifications"
          className="transition-opacity hover:opacity-80"
        >
          <Image src="/icons/bell.svg" alt="" width={24} height={21} />
        </button>
        <button type="button" aria-label="Account menu" className="rounded-full">
          <Image
            src="/icons/avatar.png"
            alt=""
            width={53}
            height={52}
            className="size-10 rounded-full md:size-[52px]"
          />
        </button>
      </div>
    </header>
  );
}
