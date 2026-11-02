"use client";

import { usePathname } from "next/navigation";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";

export function ExploreTabs() {
  const pathname = usePathname();
  return (
    <>
      {pathname.startsWith("/explore/jobs") && <h1 className="sr-only">Explore jobs</h1>}
      <SegmentedTabs
        tabs={[
          { label: "Jobs", href: "/explore/jobs", active: pathname.startsWith("/explore/jobs") },
          {
            label: "Companies",
            href: "/explore/companies",
            active: pathname.startsWith("/explore/companies"),
          },
        ]}
      />
    </>
  );
}
