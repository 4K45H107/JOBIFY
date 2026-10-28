import { describe, expect, it } from "vitest";
import { employerNav, isNavItemActive, seekerNav } from "./nav";

const find = (items: typeof seekerNav, label: string) => items.find((i) => i.label === label)!;

describe("isNavItemActive", () => {
  it("matches Home only on the exact path", () => {
    expect(isNavItemActive("/", find(seekerNav, "Home"))).toBe(true);
    expect(isNavItemActive("/explore/jobs", find(seekerNav, "Home"))).toBe(false);
    expect(isNavItemActive("/employer/company", find(employerNav, "Home"))).toBe(false);
  });

  it("matches nested routes by prefix", () => {
    expect(isNavItemActive("/explore/companies", find(seekerNav, "Explore"))).toBe(true);
    expect(isNavItemActive("/employer/jobs/123/applicants", find(employerNav, "Add Jobs"))).toBe(
      true,
    );
  });

  it("does not match sibling paths that share a prefix", () => {
    expect(isNavItemActive("/explorers", find(seekerNav, "Explore"))).toBe(false);
  });
});
