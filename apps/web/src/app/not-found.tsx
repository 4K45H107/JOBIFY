import type { Metadata } from "next";
import { NotFoundState } from "@/components/states/NotFoundState";
import { StandalonePage } from "@/components/states/StandalonePage";

export const metadata: Metadata = { title: "Page not found" };

/** Any URL that matches no page. Home sends people to the right place for their role. */
export default function NotFound() {
  return (
    <StandalonePage>
      <NotFoundState homeHref="/" />
    </StandalonePage>
  );
}
