import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata: Metadata = { title: "Explore" };

export default function Page() {
  return <ComingSoon title="Explore" figmaFrame="Explore - Companies" phase="Phase 2" />;
}
