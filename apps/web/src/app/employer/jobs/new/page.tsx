import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata: Metadata = { title: "Add job" };

export default function Page() {
  return <ComingSoon title="Add job" figmaFrame="AddJobs" phase="Phase 2" />;
}
