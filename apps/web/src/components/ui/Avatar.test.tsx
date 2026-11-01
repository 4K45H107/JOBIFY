import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Avatar, avatarColor, initials } from "./Avatar";

describe("initials", () => {
  it("takes the first and last word", () => {
    expect(initials("Ayesha Rahman")).toBe("AR");
    expect(initials("Mary Jane van Dyke")).toBe("MD");
  });
  it("uses one letter for a single name", () => {
    expect(initials("prince")).toBe("P");
  });
  it("reads an email's local part", () => {
    expect(initials("jane.doe@example.com")).toBe("JD");
  });
});

describe("avatarColor", () => {
  it("is stable per name", () => {
    expect(avatarColor("Ayesha Rahman")).toBe(avatarColor("Ayesha Rahman"));
  });
});

describe("Avatar", () => {
  it("shows the photo when there is one", () => {
    render(<Avatar src="/api/files/p.jpg" name="Ayesha Rahman" alt="Ayesha's photo" />);
    expect(screen.getByRole("img", { name: "Ayesha's photo" })).toHaveAttribute(
      "src",
      "/api/files/p.jpg",
    );
  });
  it("shows initials without a photo", () => {
    render(<Avatar src={null} name="Ayesha Rahman" alt="Ayesha's photo" />);
    expect(screen.getByRole("img", { name: "Ayesha's photo" })).toHaveTextContent("AR");
  });
  it("shows a silhouette without a name", () => {
    const { container } = render(<Avatar src={null} alt="" />);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector("text")).toBeNull();
  });
});
