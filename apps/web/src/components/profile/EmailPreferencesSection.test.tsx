import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { EmailPreference } from "@jobify/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EmailPreferencesSection } from "./EmailPreferencesSection";

// A plain function, not vi.fn(): Vitest's spy reports a rejected promise as a test failure
// even when the component catches it.
let calls: unknown[][] = [];
let respond: () => Promise<unknown> = async () => ({});
vi.mock("@/lib/api/client", () => ({
  api: (...args: unknown[]) => {
    calls.push(args);
    return respond();
  },
}));

const initial: EmailPreference[] = [
  { type: "INTERVIEW_REMINDER", label: "Interview reminders", description: "d", enabled: true },
  { type: "ASSESSMENT_ASSIGNED", label: "Skill tests", description: "d", enabled: true },
];

describe("EmailPreferencesSection", () => {
  beforeEach(() => {
    calls = [];
  });

  it("saves a switch straight away", async () => {
    respond = async () => ({
      preferences: initial.map((p) =>
        p.type === "INTERVIEW_REMINDER" ? { ...p, enabled: false } : p,
      ),
    });
    render(<EmailPreferencesSection initial={initial} />);
    const toggle = screen.getByRole("switch", { name: "Interview reminders" });
    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(calls).toEqual([
      [
        "/me/email-preferences",
        { method: "PUT", json: { preferences: [{ type: "INTERVIEW_REMINDER", enabled: false }] } },
      ],
    ]);
    await waitFor(() => expect(toggle).toHaveAttribute("aria-checked", "false"));
  });

  it("puts the switch back and says so when saving fails", async () => {
    respond = async () => {
      throw new Error("offline");
    };
    render(<EmailPreferencesSection initial={initial} />);
    const toggle = screen.getByRole("switch", { name: "Skill tests" });
    fireEvent.click(toggle);

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't save");
    expect(toggle).toHaveAttribute("aria-checked", "true");
  });
});
