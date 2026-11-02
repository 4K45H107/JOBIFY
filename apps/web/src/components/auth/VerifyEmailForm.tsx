"use client";

import Link from "next/link";
import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/messages";

type State = { kind: "idle" | "working" | "done" } | { kind: "error"; message: string };

/**
 * A button, not a request on page load: mail systems' link scanners open links, and must not
 * verify an address on someone's behalf.
 */
export function VerifyEmailForm({ token }: { token: string }) {
  const [state, setState] = useState<State>(
    token ? { kind: "idle" } : { kind: "error", message: "This verification link is incomplete." },
  );

  const verify = async () => {
    setState({ kind: "working" });
    try {
      await api("/auth/email/verify", { method: "POST", json: { token } });
      setState({ kind: "done" });
    } catch (error) {
      setState({ kind: "error", message: errorMessage(error) });
    }
  };

  if (state.kind === "done") {
    return (
      <div className="flex flex-col gap-5">
        <h1 className="text-3xl font-medium">Email verified</h1>
        <p className="text-lg">Thanks! You can now apply to jobs and post them on Jobify.</p>
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 font-medium text-primary-fg"
        >
          Continue to Jobify
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-3xl font-medium">Verify your email</h1>
      <p className="text-lg">Confirm that this email address is yours.</p>
      {state.kind === "error" && (
        <Alert>{state.message} Sign in and send a new link from Settings › Account settings.</Alert>
      )}
      <Button onClick={verify} disabled={!token || state.kind === "working"}>
        {state.kind === "working" ? "Verifying…" : "Verify my email"}
      </Button>
    </div>
  );
}
