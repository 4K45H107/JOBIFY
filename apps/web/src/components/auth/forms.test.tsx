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

const employer = {
  id: "u1",
  email: "e@x.co",
  role: "EMPLOYER",
  fullName: "E",
  photoUrl: null,
  company: { id: "c1", name: "Co", slug: "co", role: "ADMIN", status: "ACTIVE" },
};
const seeker = {
  id: "u2",
  email: "s@x.co",
  role: "SEEKER",
  fullName: "S",
  photoUrl: null,
  company: null,
};

describe("LoginForm", () => {
  it("validates before calling the API", async () => {
    render(<LoginForm google={false} />);
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Enter a valid email address")).toBeInTheDocument();
    expect(screen.getByText("Enter your password")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows a friendly message for wrong credentials", async () => {
    respond(401, { statusCode: 401, message: "Incorrect email or password" });
    render(<LoginForm google={false} />);
    await userEvent.type(screen.getByLabelText("Email"), "a@b.co");
    await userEvent.type(screen.getByLabelText("Password"), "nope");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Incorrect email or password.");
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("sends employers to /employer and ignores a ?next= from the seeker area", async () => {
    search.value = "next=/activities";
    respond(200, employer);
    render(<LoginForm google={false} />);
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
    render(<LoginForm google={false} />);
    await userEvent.type(screen.getByLabelText("Email"), "s@x.co");
    await userEvent.type(screen.getByLabelText("Password"), "Password123");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/activities"));
  });
});

it("sends an employer without a company to onboarding", async () => {
  respond(200, { ...employer, company: null });
  render(<LoginForm google={false} />);
  await userEvent.type(screen.getByLabelText("Email"), "e@x.co");
  await userEvent.type(screen.getByLabelText("Password"), "Password123");
  await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
  await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/employer/onboarding"));
});

describe("RegisterForm", () => {
  it("submits the chosen role and shows a duplicate-email error inline", async () => {
    respond(409, { statusCode: 409, message: "An account with this email already exists" });
    render(<RegisterForm google={false} />);
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
    render(<RegisterForm google={false} />);
    await userEvent.type(screen.getByLabelText("Password"), "short");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText("Use at least 8 characters")).toBeInTheDocument();
  });
});

describe("Google sign-in", () => {
  it("is hidden unless the API has it switched on", () => {
    render(<LoginForm google={false} />);
    expect(screen.queryByRole("link", { name: "Continue with Google" })).toBeNull();
  });

  it("keeps ?next= on the sign-in page, and shows why a Google attempt failed", () => {
    search.value = "next=%2Fjobs%2F1&error=google-cancelled";
    render(<LoginForm google />);
    expect(screen.getByRole("link", { name: "Continue with Google" })).toHaveAttribute(
      "href",
      "/api/auth/google?next=%2Fjobs%2F1",
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Google sign-in was cancelled.");
  });

  it("passes the chosen role from the sign-up page", async () => {
    render(<RegisterForm google />);
    expect(screen.getByRole("link", { name: "Sign up with Google" })).toHaveAttribute(
      "href",
      "/api/auth/google?role=SEEKER",
    );
    await userEvent.click(screen.getByText("I'm hiring"));
    expect(screen.getByRole("link", { name: "Sign up with Google to hire" })).toHaveAttribute(
      "href",
      "/api/auth/google?role=EMPLOYER",
    );
  });
});
