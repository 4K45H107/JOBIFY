import { ExploreTabs } from "./ExploreTabs";

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <ExploreTabs />
      {children}
    </div>
  );
}
