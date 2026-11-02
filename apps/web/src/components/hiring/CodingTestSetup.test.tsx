import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { CodingProblem, CodingProblemList } from "@jobify/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CodingTestSetup } from "./CodingTestSetup";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));

let calls: { path: string; init?: { method?: string; json?: unknown } }[] = [];
const detail = (slug: string, title: string, difficulty: CodingProblem["difficulty"]) => ({
  slug,
  title,
  difficulty,
  topics: ["arrays"],
  summary: `${title} summary.`,
  statement: `${title} statement.`,
  inputFormat: "in",
  outputFormat: "out",
  constraints: ["n ≤ 10"],
  samples: [{ input: "1\n", output: "1", explanation: null }],
  hiddenTests: 7,
});
const problems: Record<string, CodingProblem> = {
  "two-sum": detail("two-sum", "Two Sum", "MEDIUM"),
  knapsack: detail("knapsack", "Knapsack", "HARD"),
};
vi.mock("@/lib/api/client", () => ({
  api: async (path: string, init?: { method?: string; json?: unknown }) => {
    calls.push({ path, init });
    if (path.startsWith("/coding-problems/")) return problems[path.split("/").at(-1)!];
    return {};
  },
}));

const library: CodingProblemList = {
  items: Object.values(problems).map(({ slug, title, difficulty, topics, summary }) => ({
    slug,
    title,
    difficulty,
    topics,
    summary,
  })),
  topics: ["arrays"],
};

describe("CodingTestSetup", () => {
  beforeEach(() => {
    calls = [];
  });

  it("filters the library by difficulty and previews a problem", async () => {
    render(<CodingTestSetup jobId="j1" jobTitle="Engineer" initial={null} library={library} />);
    const list = screen.getByRole("list", { name: "Problems" });
    expect(list.querySelectorAll("li")).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Hard", pressed: false }));
    expect(list.querySelectorAll("li")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: /Knapsack/ }));
    expect(await screen.findByRole("heading", { name: "Knapsack" })).toBeInTheDocument();
    expect(screen.getByText(/Plus 7 hidden tests/)).toBeInTheDocument();
  });

  it("uses a problem with a time suited to it and saves a coding test", async () => {
    render(<CodingTestSetup jobId="j1" jobTitle="Engineer" initial={null} library={library} />);
    fireEvent.click(screen.getByRole("button", { name: /Two Sum/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Use this problem" }));
    expect(screen.getByLabelText("Time limit (minutes)")).toHaveValue(45);

    fireEvent.click(screen.getByRole("button", { name: "Save coding test" }));
    await waitFor(() => expect(calls.some((c) => c.init?.method === "PUT")).toBe(true));
    expect(calls.find((c) => c.init?.method === "PUT")).toEqual({
      path: "/jobs/j1/assessment",
      init: {
        method: "PUT",
        json: {
          kind: "CODING",
          title: "Engineer coding test",
          timeLimitMin: 45,
          problemSlug: "two-sum",
        },
      },
    });
    expect(await screen.findByText(/Saved\. New applicants/)).toBeInTheDocument();
  });

  it("warns before replacing a multiple-choice test", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(
      <CodingTestSetup
        jobId="j1"
        jobTitle="Engineer"
        library={library}
        initial={{
          id: "a1",
          jobId: "j1",
          kind: "MCQ",
          title: "Old",
          timeLimitMin: 10,
          questions: [],
          problem: null,
          locked: false,
          stats: { started: 0, submitted: 0, averageScore: null },
        }}
      />,
    );
    expect(screen.getByText(/Saving a coding test replaces it/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Two Sum/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Use this problem" }));
    fireEvent.click(screen.getByRole("button", { name: "Save coding test" }));
    expect(confirm).toHaveBeenCalled();
    expect(calls.some((c) => c.init?.method === "PUT")).toBe(false);
  });
});
