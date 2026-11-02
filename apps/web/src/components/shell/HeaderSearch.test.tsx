import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HeaderSearch } from "./HeaderSearch";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/",
}));

let calls: string[] = [];
let failJobs = false;
vi.mock("@/lib/api/client", () => ({
  api: async (path: string) => {
    calls.push(path);
    if (path.includes("jobs")) {
      if (failJobs) throw new Error("down");
      return {
        items: [
          {
            id: "j1",
            title: "Data Analyst",
            type: "FULL_TIME",
            city: "Dhaka",
            country: "Bangladesh",
            company: { name: "Northwind Labs", logoUrl: null },
          },
        ],
      };
    }
    return {
      items: [
        {
          id: "c1",
          slug: "northwind-labs",
          name: "Northwind Labs",
          industry: "Software",
          openJobs: 1,
          logoUrl: null,
        },
      ],
    };
  },
}));

const box = () => screen.getByRole("combobox", { name: /Search/ });

describe("HeaderSearch", () => {
  beforeEach(() => {
    calls = [];
    failJobs = false;
    push.mockClear();
  });

  it("waits for two characters, then suggests jobs and companies", async () => {
    render(<HeaderSearch role="SEEKER" />);
    fireEvent.change(box(), { target: { value: "d" } });
    await new Promise((r) => setTimeout(r, 300));
    expect(calls).toEqual([]);

    fireEvent.change(box(), { target: { value: "data" } });
    expect(await screen.findByRole("option", { name: /Data Analyst/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Northwind Labs Software/ })).toHaveAttribute(
      "href",
      "/companies/northwind-labs",
    );
    expect(calls).toEqual(["/jobs?q=data&pageSize=5", "/companies?q=data&pageSize=4"]);
  });

  it("moves through options with the arrow keys and opens one with Enter", async () => {
    render(<HeaderSearch role="SEEKER" />);
    fireEvent.change(box(), { target: { value: "data" } });
    await screen.findByRole("option", { name: /Data Analyst/ });

    fireEvent.keyDown(box(), { key: "ArrowDown" });
    expect(screen.getByRole("option", { name: /Data Analyst/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    fireEvent.keyDown(box(), { key: "Enter" });
    expect(push).toHaveBeenCalledWith("/jobs/j1");
  });

  it("sends Enter with nothing picked to the full results", async () => {
    render(<HeaderSearch role="SEEKER" />);
    fireEvent.change(box(), { target: { value: "data science" } });
    fireEvent.keyDown(box(), { key: "Enter" });
    expect(push).toHaveBeenCalledWith("/explore/jobs?tab=search&q=data%20science");
  });

  it("searches an employer's own jobs and links to employer pages", async () => {
    render(<HeaderSearch role="EMPLOYER" />);
    fireEvent.change(box(), { target: { value: "data" } });
    expect(await screen.findByRole("option", { name: /Data Analyst/ })).toHaveAttribute(
      "href",
      "/employer/jobs/j1",
    );
    expect(calls[0]).toBe("/employer/jobs?q=data&pageSize=5");
    expect(screen.getByRole("option", { name: /See all companies/ })).toHaveAttribute(
      "href",
      "/employer/explore?q=data",
    );
  });

  it("still shows companies when the job search fails", async () => {
    failJobs = true;
    render(<HeaderSearch role="SEEKER" />);
    fireEvent.change(box(), { target: { value: "north" } });
    expect(await screen.findByRole("option", { name: /Northwind Labs/ })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /Data Analyst/ })).not.toBeInTheDocument();
  });

  it("focuses with the / key", async () => {
    render(<HeaderSearch role="SEEKER" />);
    fireEvent.keyDown(document.body, { key: "/" });
    await waitFor(() => expect(box()).toHaveFocus());
  });
});
