import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata: Metadata = { title: "Employer home" };

export default function Page() {
  return <ComingSoon title="Employer home" figmaFrame="Employer Home" phase="Phase 2" />;
}
