import Link from "next/link";

/** "Page not found", inside the app shell or on its own. */
export function NotFoundState({ homeHref }: { homeHref: string }) {
  return (
    <section className="mx-auto flex max-w-lg flex-col items-center gap-4 py-16 text-center">
      <p className="font-brand text-7xl text-fg-subtle">404</p>
      <h1 className="text-3xl font-medium">Page not found</h1>
      <p className="text-fg-subtle">
        This page doesn&apos;t exist, or it was removed. A job may have been closed or deleted.
      </p>
      <Link
        href={homeHref}
        className="inline-flex h-10 items-center rounded-full bg-primary px-8 font-medium tracking-label text-primary-fg uppercase hover:opacity-90"
      >
        Go home
      </Link>
    </section>
  );
}
