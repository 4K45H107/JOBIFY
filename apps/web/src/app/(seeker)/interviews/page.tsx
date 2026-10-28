import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata: Metadata = { title: "Interviews" };

export default function Page() {
  return <ComingSoon title="Interviews" figmaFrame="Interviews" phase="Phase 4" />;
}
