import Link from "next/link";

/** A page outside the app shell (404, errors): the black top bar with the logo. */
export function StandalonePage({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="bg-chrome px-4 py-4 text-chrome-fg md:px-6">
        <Link href="/" className="font-brand text-2xl md:text-[32px]">
          Jobify.
        </Link>
      </header>
      <main className="px-4 md:px-6">{children}</main>
    </div>
  );
}
