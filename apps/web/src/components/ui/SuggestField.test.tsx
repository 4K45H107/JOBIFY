import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";
import { SuggestField } from "./SuggestField";

const COUNTRIES = ["Bangladesh", "Belgium", "India", "Indonesia", "United Kingdom"];

function Harness({ openOnFocus = false }) {
  const { register, watch } = useForm({ defaultValues: { country: "" } });
  return (
    <>
      <SuggestField
        label="Country"
        suggestions={COUNTRIES}
        openOnFocus={openOnFocus}
        {...register("country")}
      />
      <output>{watch("country")}</output>
    </>
  );
}

describe("SuggestField", () => {
  it("suggests matches from the front as you type and fills the form on click", async () => {
    render(<Harness />);
    const input = screen.getByRole("combobox", { name: "Country" });
    await userEvent.type(input, "in");
    const options = screen.getAllByRole("option").map((o) => o.textContent);
    expect(options).toEqual(["India", "Indonesia"]);
    await userEvent.click(screen.getByRole("option", { name: "Indonesia" }));
    expect(input).toHaveValue("Indonesia");
    expect(screen.getByRole("status")).toHaveTextContent("Indonesia");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("matches the start of later words, and picks with the arrow keys and Enter", async () => {
    render(<Harness />);
    const input = screen.getByRole("combobox", { name: "Country" });
    await userEvent.type(input, "king{ArrowDown}");
    expect(input).toHaveAttribute("aria-activedescendant");
    await userEvent.keyboard("{Enter}");
    expect(screen.getByRole("status")).toHaveTextContent("United Kingdom");
  });

  it("keeps free text, closes on Escape, and can open on focus", async () => {
    render(<Harness openOnFocus />);
    const input = screen.getByRole("combobox", { name: "Country" });
    await userEvent.click(input);
    expect(screen.getAllByRole("option")).toHaveLength(COUNTRIES.length);
    await userEvent.type(input, "Mars{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Mars");
  });
});
