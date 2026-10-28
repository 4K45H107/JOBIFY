import Link from "next/link";

/**
 * Not in Figma. Uses its black brand panel, the "Jobify." logo and the
 * Home frame's tagline, next to a plain form column.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh grid-rows-[auto_1fr] md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:grid-rows-1">
      <aside className="flex flex-col justify-between bg-chrome px-6 py-6 text-chrome-fg md:px-12 md:py-10">
        <Link href="/login" className="font-brand text-3xl md:text-[40px]">
          Jobify.
        </Link>
        <div className="hidden flex-col gap-4 md:flex">
          <h2 className="text-5xl leading-tight font-medium">Your job searching starts here.</h2>
          <p className="max-w-md text-lg text-chrome-fg/70">
            Find a job that suits you. Apply in one click, take the skill test and join the
            interview, all in one place.
          </p>
        </div>
        <p className="hidden text-sm text-chrome-fg/50 md:block">Dive into the realm of jobs.</p>
      </aside>
      <main className="flex items-start justify-center px-4 py-8 md:items-center md:px-10 md:py-10">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
