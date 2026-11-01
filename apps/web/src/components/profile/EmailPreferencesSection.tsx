"use client";

import { useState } from "react";
import type { EmailPreference, EmailPreferences, NotificationType } from "@jobify/shared";
import { Alert } from "@/components/ui/Alert";
import { Card, CardHeader } from "@/components/ui/Card";
import { api } from "@/lib/api/client";
import { cn } from "@/lib/cn";

/** On/off per kind of email. Each switch saves straight away and reverts if saving fails. */
export function EmailPreferencesSection({ initial }: { initial: EmailPreference[] }) {
  const [prefs, setPrefs] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  const toggle = async (type: NotificationType, enabled: boolean) => {
    setError(null);
    const before = prefs;
    setPrefs((list) => list.map((p) => (p.type === type ? { ...p, enabled } : p)));
    try {
      const saved = await api<EmailPreferences>("/me/email-preferences", {
        method: "PUT",
        json: { preferences: [{ type, enabled }] },
      });
      setPrefs(saved.preferences);
    } catch {
      setPrefs(before);
      setError("Couldn't save that change. Please try again.");
    }
  };

  return (
    <Card>
      <CardHeader
        title="Email notifications"
        description="Choose which updates we also send to your inbox. You always see them under the bell."
      />
      {error && <Alert className="mb-4">{error}</Alert>}
      <ul className="divide-y divide-border">
        {prefs.map((p) => (
          <li key={p.type} className="flex items-center justify-between gap-6 py-4">
            <div>
              <p id={`email-${p.type}`} className="font-medium">
                {p.label}
              </p>
              <p className="text-sm text-fg-subtle">{p.description}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={p.enabled}
              aria-labelledby={`email-${p.type}`}
              onClick={() => toggle(p.type, !p.enabled)}
              className={cn(
                "relative h-7 w-12 shrink-0 rounded-full transition",
                p.enabled ? "bg-success" : "bg-track",
              )}
            >
              <span
                className={cn(
                  "absolute top-1 left-1 size-5 rounded-full bg-white shadow transition-transform",
                  p.enabled && "translate-x-5",
                )}
              />
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
