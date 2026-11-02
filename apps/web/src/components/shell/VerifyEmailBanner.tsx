"use client";

import { useState } from "react";
import { api } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/messages";

/** Shown until the email is verified: applying and posting jobs need it. */
export function VerifyEmailBanner({ email }: { email: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | { error: string }>("idle");

  const resend = async () => {
    setState("sending");
    try {
      await api("/auth/email/resend", { method: "POST" });
      setState("sent");
    } catch (error) {
      setState({ error: errorMessage(error) });
    }
  };

  return (
    <div
      role="status"
      className="flex shrink-0 flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-border bg-chip/25 px-4 py-2 text-center text-sm"
    >
      <span>
        Verify your email to apply to and post jobs. We sent a link to <strong>{email}</strong>.
      </span>
      {state === "sent" ? (
        <span className="text-fg-subtle">New link sent. Check your inbox (and spam).</span>
      ) : typeof state === "object" ? (
        <span className="text-heading-accent">{state.error}</span>
      ) : (
        <button
          type="button"
          onClick={resend}
          disabled={state === "sending"}
          className="font-medium text-link underline disabled:opacity-60"
        >
          {state === "sending" ? "Sending…" : "Send a new link"}
        </button>
      )}
    </div>
  );
}
