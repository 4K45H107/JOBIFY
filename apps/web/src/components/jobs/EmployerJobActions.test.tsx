import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { JobDetail } from "@jobify/shared";
import { EmployerJobActions } from "./EmployerJobActions";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const job = { id: "j1", status: "OPEN" } as JobDetail;
const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("confirm", () => true);
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify({ ...job, status: "CLOSED" }), { status: 200 }),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("EmployerJobActions", () => {
  it("closes the job even without an onChanged callback", async () => {
    render(<EmployerJobActions job={job} />);
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0]![0]).toBe("/api/jobs/j1");
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body as string)).toEqual({ status: "CLOSED" });
  });

  it("publishes a draft without asking for confirmation", async () => {
    const confirm = vi.fn(() => true);
    vi.stubGlobal("confirm", confirm);
    const onChanged = vi.fn();
    render(<EmployerJobActions job={{ ...job, status: "DRAFT" }} onChanged={onChanged} />);
    await userEvent.click(screen.getByRole("button", { name: "Publish" }));
    await waitFor(() =>
      expect(onChanged).toHaveBeenCalledWith(expect.objectContaining({ status: "CLOSED" })),
    );
    expect(confirm).not.toHaveBeenCalled();
  });
});
