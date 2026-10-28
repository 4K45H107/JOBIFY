import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { employerNav, seekerNav } from "./nav";
import { Sidebar } from "./Sidebar";

const pathname = vi.hoisted(() => ({ value: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.value }));

describe("Sidebar", () => {
  it("renders every seeker item and marks the current page", () => {
    pathname.value = "/explore/companies";
    render(<Sidebar items={seekerNav} />);

    for (const item of seekerNav) {
      expect(screen.getByRole("link", { name: item.label })).toHaveAttribute("href", item.href);
    }
    expect(screen.getByRole("link", { name: "Explore" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current");
  });

  it("highlights employer Home only on /employer", () => {
    pathname.value = "/employer";
    render(<Sidebar items={employerNav} />);
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");
    expect(screen.getAllByRole("link").filter((l) => l.getAttribute("aria-current"))).toHaveLength(
      1,
    );
  });
});
