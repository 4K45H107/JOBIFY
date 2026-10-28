import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "./LoginForm";
import { RegisterForm } from "./RegisterForm";

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
const search = vi.hoisted(() => ({ value: "" }));
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  useSearchParams: () => new URLSearchParams(search.value),
}));

const fetchMock = vi.fn();
const respond = (status: number, body: unknown) =>
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(body), { status }));

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  search.value = "";
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

const employer = { id: "u1", email: "e@x.co", role: "EMPLOYER", fullName: "E", company: null };
const seeker = { id: "u2", email: "s@x.co", role: "SEEKER", fullName: "S", company: null };

describe("LoginForm", () => {
  it("validates before calling the API", async () => {
    render(<LoginForm />);
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Enter a valid email address")).toBeInTheDocument();
    expect(screen.getByText("Enter your password")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows a friendly message for wrong credentials", async () => {
    respond(401, { statusCode: 401, message: "Incorrect email or password" });
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText("Email"), "a@b.co");
    await userEvent.type(screen.getByLabelText("Password"), "nope");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Incorrect email or password.");
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("sends employers to /employer and ignores a ?next= from the seeker area", async () => {
    search.value = "next=/activities";
    respond(200, employer);
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText("Email"), "e@x.co");
    await userEvent.type(screen.getByLabelText("Password"), "Password123");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/employer"));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/login",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("returns seekers to a safe ?next= path", async () => {
    search.value = "next=%2Factivities";
    respond(200, seeker);
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText("Email"), "s@x.co");
    await userEvent.type(screen.getByLabelText("Password"), "Password123");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/activities"));
  });
});

describe("RegisterForm", () => {
  it("submits the chosen role and shows a duplicate-email error inline", async () => {
    respond(409, { statusCode: 409, message: "An account with this email already exists" });
    render(<RegisterForm />);
    await userEvent.click(screen.getByText("I'm hiring"));
    await userEvent.type(screen.getByLabelText("Full name"), "Tanvir Hasan");
    await userEvent.type(screen.getByLabelText("Email"), "t@x.co");
    await userEvent.type(screen.getByLabelText("Password"), "Password123");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(
      await screen.findByText("An account with this email already exists"),
    ).toBeInTheDocument();
    const body = JSON.parse(fetchMock.mock.calls[0]![1].body as string);
    expect(body).toMatchObject({ role: "EMPLOYER", fullName: "Tanvir Hasan" });
  });

  it("explains password rules", async () => {
    render(<RegisterForm />);
    await userEvent.type(screen.getByLabelText("Password"), "short");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText("Use at least 8 characters")).toBeInTheDocument();
  });
});
