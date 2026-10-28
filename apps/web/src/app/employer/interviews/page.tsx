import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata: Metadata = { title: "Interview schedule" };

export default function Page() {
  return <ComingSoon title="Interview schedule" figmaFrame="Interviews" phase="Phase 4" />;
}
