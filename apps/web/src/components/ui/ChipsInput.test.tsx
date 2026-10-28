import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { ChipsInput } from "./ChipsInput";

function Harness({ initial = [] as string[], max = 3 }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <ChipsInput label="Skills" value={value} onChange={setValue} max={max} />
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
});
