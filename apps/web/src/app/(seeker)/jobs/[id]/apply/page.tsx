import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata: Metadata = { title: "Easy Apply" };

export default function ApplyPage() {
  return <ComingSoon title="Easy Apply" figmaFrame="Easy Apply 1–3" phase="Phase 3" />;
}
