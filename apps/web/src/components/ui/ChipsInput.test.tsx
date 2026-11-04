import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { ChipsInput } from "./ChipsInput";

function Harness({
  initial = [] as string[],
  max = 3,
  suggestions = [] as string[],
  loadSuggestions,
}: {
  initial?: string[];
  max?: number;
  suggestions?: string[];
  loadSuggestions?: (q: string) => Promise<string[]>;
}) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <ChipsInput
        label="Skills"
        value={value}
        onChange={setValue}
        max={max}
        suggestions={suggestions}
        loadSuggestions={loadSuggestions}
      />
      <output>{value.join(",")}</output>
    </>
  );
}

describe("ChipsInput", () => {
  it("adds on Enter and comma, ignoring blanks and case-insensitive duplicates", async () => {
    render(<Harness initial={["React"]} />);
    const input = screen.getByLabelText("Skills");
    await userEvent.type(input, "Vue{Enter}  {Enter}react{Enter}Go,");
    expect(screen.getByRole("status")).toHaveTextContent("React,Vue,Go");
  });

  it("removes with × and with Backspace on an empty input", async () => {
    render(<Harness initial={["A", "B"]} />);
    await userEvent.click(screen.getByRole("button", { name: "Remove A" }));
    expect(screen.getByRole("status")).toHaveTextContent(/^B$/);
    await userEvent.type(screen.getByLabelText("Skills"), "{Backspace}");
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("stops accepting input at the limit", async () => {
    render(<Harness initial={["A", "B", "C"]} max={3} />);
    expect(screen.getByLabelText("Skills")).toBeDisabled();
  });

  it("suggests matches, leaving out chosen ones, and adds the picked one", async () => {
    render(<Harness initial={["React"]} suggestions={["React", "React Native", "Redux", "Go"]} />);
    const input = screen.getByRole("combobox", { name: "Skills" });
    await userEvent.type(input, "re");
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
      "React Native",
      "Redux",
    ]);
    await userEvent.click(screen.getByRole("option", { name: "Redux" }));
    expect(screen.getByRole("status")).toHaveTextContent("React,Redux");
    expect(input).toHaveValue("");
    expect(input).toHaveFocus();
  });

  it("Enter adds the highlighted suggestion, or the typed text when none is highlighted", async () => {
    render(<Harness max={5} suggestions={["TypeScript", "Terraform"]} />);
    const input = screen.getByRole("combobox", { name: "Skills" });
    await userEvent.type(input, "ty{ArrowDown}{Enter}te{Enter}");
    expect(screen.getByRole("status")).toHaveTextContent("TypeScript,te");
  });

  it("adds options loaded for what's typed", async () => {
    const load = vi.fn(async () => ["Svelte"]);
    render(<Harness loadSuggestions={load} />);
    await userEvent.type(screen.getByRole("combobox", { name: "Skills" }), "sv");
    expect(await screen.findByRole("option", { name: "Svelte" })).toBeInTheDocument();
    expect(load).toHaveBeenLastCalledWith("sv");
  });
});
