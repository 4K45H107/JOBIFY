import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ForgotPasswordForm } from "./ForgotPasswordForm";
import { ResetPasswordForm } from "./ResetPasswordForm";

// A plain function, not vi.fn(): see EmailPreferencesSection.test.tsx.
let calls: unknown[][] = [];
vi.mock("@/lib/api/client", () => ({
  api: async (...args: unknown[]) => {
    calls.push(args);
    return undefined;
  },
}));

const type = (label: string, value: string) =>
  fireEvent.input(screen.getByLabelText(label), { target: { value } });

describe("account forms", () => {
  beforeEach(() => {
    calls = [];
  });

  it("forgot password: the same confirmation, whoever's email it is", async () => {
    render(<ForgotPasswordForm />);
    type("Email", "Someone@Example.com");
    fireEvent.click(screen.getByRole("button", { name: "Send reset link" }));
    expect(await screen.findByText(/If there's a Jobify account for/)).toBeInTheDocument();
    expect(calls).toEqual([
      ["/auth/password/forgot", { method: "POST", json: { email: "someone@example.com" } }],
    ]);
  });

  it("reset password: checks the two passwords match before sending", async () => {
    render(<ResetPasswordForm token="tok" />);
    type("New password", "Password123");
    type("Confirm new password", "Password124");
    fireEvent.click(screen.getByRole("button", { name: "Set new password" }));
    expect(await screen.findByText("The passwords don't match")).toBeInTheDocument();
    expect(calls).toEqual([]);

    type("Confirm new password", "Password123");
    fireEvent.click(screen.getByRole("button", { name: "Set new password" }));
    await waitFor(() =>
      expect(calls).toEqual([
        [
          "/auth/password/reset",
          { method: "POST", json: { token: "tok", password: "Password123" } },
        ],
      ]),
    );
    expect(await screen.findByText("Password changed")).toBeInTheDocument();
  });

  it("reset password: says so when the link has no token", () => {
    render(<ResetPasswordForm token="" />);
    expect(screen.getByRole("alert")).toHaveTextContent("This reset link is incomplete");
    expect(screen.getByRole("button", { name: "Set new password" })).toBeDisabled();
  });
});
