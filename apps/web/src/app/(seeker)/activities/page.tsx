import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata: Metadata = { title: "Activities" };

export default function Page() {
  return <ComingSoon title="Activities" figmaFrame="Activities" phase="Phase 2" />;
}
