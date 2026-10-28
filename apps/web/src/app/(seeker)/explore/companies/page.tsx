import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata: Metadata = { title: "Companies" };

export default function Page() {
  return <ComingSoon title="Companies" figmaFrame="Explore - Companies" phase="Phase 2" />;
}
