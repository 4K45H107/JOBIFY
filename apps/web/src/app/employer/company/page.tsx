import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata: Metadata = { title: "My Company" };

export default function Page() {
  return <ComingSoon title="My Company" figmaFrame="Company Profile employer" phase="Phase 1" />;
}
