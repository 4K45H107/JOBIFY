"use client";

import Link from "next/link";
import { useState } from "react";
import type { UnsubscribeResult } from "@jobify/shared";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";

type State =
  | { kind: "idle" | "working" }
  | { kind: "done"; result: UnsubscribeResult }
  | { kind: "error"; message: string };

/**
 * A button, not a request on page load: mail systems' link scanners open links, and must not
 * unsubscribe anyone by doing so. (Mail apps' own one-click button posts to the API directly.)
 */
export function UnsubscribeForm({ token }: { token: string }) {
  const [state, setState] = useState<State>(
    token ? { kind: "idle" } : { kind: "error", message: "This unsubscribe link is incomplete." },
  );

  const unsubscribe = async () => {
    setState({ kind: "working" });
    try {
      const result = await api<UnsubscribeResult>("/email/unsubscribe", {
        method: "POST",
        json: { token },
      });
      setState({ kind: "done", result });
    } catch (error) {
      setState({
        kind: "error",
        message:
          error instanceof ApiError ? error.message : "Something went wrong. Please try again.",
      });
    }
  };

  if (state.kind === "done") {
    return (
      <div className="flex flex-col gap-5">
        <h1 className="text-3xl font-medium">You&apos;re unsubscribed</h1>
        <p className="text-lg">
          You won&apos;t get “{state.result.label}” emails any more. You&apos;ll still see these
          updates under the bell in Jobify.
        </p>
        <Link href={state.result.settingsHref} className="text-link underline">
          Change your other email settings
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-3xl font-medium">Unsubscribe</h1>
      <p className="text-lg">Stop getting this kind of email from Jobify?</p>
      {state.kind === "error" && <Alert>{state.message}</Alert>}
      <Button onClick={unsubscribe} disabled={!token || state.kind === "working"}>
        {state.kind === "working" ? "Unsubscribing…" : "Unsubscribe"}
      </Button>
    </div>
  );
}
