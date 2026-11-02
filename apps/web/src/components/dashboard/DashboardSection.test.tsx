import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Dashboard } from "@jobify/shared";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardSection } from "./DashboardSection";

let calls: string[] = [];
let respond: (path: string) => Promise<unknown> = async () => ({});
vi.mock("@/lib/api/client", () => ({
  api: (path: string) => {
    calls.push(path);
    return respond(path);
  },
}));

const days = (values: number[]) =>
  values.map((value, i) => ({ date: `2026-10-${String(27 + i).padStart(2, "0")}`, value }));

const dashboard = (range: "week" | "month" = "week"): Dashboard => ({
  range,
  stats: [
    { key: "applications", label: "Total applications", value: 6 },
    { key: "rejected", label: "Rejected", value: 1 },
  ],
  series: [
    { key: "applications", label: "Applications", points: days([0, 2, 0, 0, 1, 0, 0]) },
    { key: "views", label: "Jobs viewed", points: days([0, 0, 0, 0, 0, 0, 0]) },
  ],
});

describe("DashboardSection", () => {
  beforeAll(() => {
    // jsdom has no layout: report a fixed width so the chart draws.
    globalThis.ResizeObserver = class {
      constructor(private cb: ResizeObserverCallback) {}
      observe() {
        this.cb([{ contentRect: { width: 600 } } as ResizeObserverEntry], this as never);
      }
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  });
  beforeEach(() => {
    calls = [];
    respond = async (path) => dashboard(path.includes("range=month") ? "month" : "week");
  });

  it("shows the counts and the chart, in the viewer's time zone", async () => {
    render(<DashboardSection emptyHint="Nothing yet" />);
    expect(await screen.findByText("Total applications")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();
    expect(await screen.findByRole("img", { name: /Applications per day/ })).toBeInTheDocument();
    expect(calls[0]).toMatch(/^\/me\/dashboard\?range=week&tz=/);
    // The table view lists every day.
    expect(screen.getAllByRole("row")).toHaveLength(8);
  });

  it("switches series and range", async () => {
    render(<DashboardSection emptyHint="Nothing yet" />);
    fireEvent.click(await screen.findByRole("tab", { name: "Jobs viewed" }));
    expect(screen.getByRole("img", { name: /Jobs viewed per day/ })).toBeInTheDocument();
    expect(screen.getByText("No jobs viewed in this period yet.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Time range"), { target: { value: "month" } });
    await waitFor(() => expect(calls.at(-1)).toMatch(/range=month/));
  });

  it("offers a retry when loading fails", async () => {
    respond = async () => {
      throw new Error("down");
    };
    render(<DashboardSection emptyHint="Nothing yet" />);
    const retry = await screen.findByRole("button", { name: "Try again" });
    respond = async () => dashboard();
    fireEvent.click(retry);
    expect(await screen.findByText("Total applications")).toBeInTheDocument();
  });
});
