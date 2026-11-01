import { ExploreTabs } from "./ExploreTabs";

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return (
    // A full-screen child (Jobs › For You, marked data-fill) needs a fixed height to fill; other tabs
    // keep a natural height and scroll as one page.
    <div className="flex flex-col gap-6 lg:has-[>[data-fill]]:h-full">
      <ExploreTabs />
      {children}
    </div>
  );
}
