import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata: Metadata = { title: "Home" };

export default function Page() {
  return <ComingSoon title="Home" figmaFrame="Home" phase="Phase 2" />;
}
