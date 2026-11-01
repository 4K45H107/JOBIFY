import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { parseTheme, themeAttribute } from "@/lib/theme";
import { ThemeSwitcher } from "./ThemeSwitcher";

afterEach(() => {
  document.cookie = "jobify-theme=; path=/; max-age=0";
  delete document.documentElement.dataset.theme;
});

describe("theme helpers", () => {
  it("defaults to light", () => {
    expect(parseTheme(undefined)).toBe("light");
    expect(parseTheme("purple")).toBe("light");
    expect(parseTheme("dark")).toBe("dark");
  });
  it("leaves the attribute off for system", () => {
    expect(themeAttribute("system")).toBeUndefined();
    expect(themeAttribute("dark")).toBe("dark");
  });
});

describe("ThemeSwitcher", () => {
  it("starts on Light without a saved choice", () => {
    render(<ThemeSwitcher />);
    expect(screen.getByRole("radio", { name: "Light" })).toHaveAttribute("aria-checked", "true");
  });

  it("applies and remembers the choice", () => {
    render(<ThemeSwitcher />);
    fireEvent.click(screen.getByRole("radio", { name: "Dark" }));
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.cookie).toContain("jobify-theme=dark");

    fireEvent.click(screen.getByRole("radio", { name: "System" }));
    expect(document.documentElement.dataset.theme).toBeUndefined();
    expect(document.cookie).toContain("jobify-theme=system");
  });

  it("reads a saved choice", () => {
    document.cookie = "jobify-theme=dark; path=/";
    render(<ThemeSwitcher />);
    expect(screen.getByRole("radio", { name: "Dark" })).toHaveAttribute("aria-checked", "true");
  });
});
