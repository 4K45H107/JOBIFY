import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { type Attempt, CODING_STARTER_CODE } from "@jobify/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CodingExam } from "./CodingExam";

// Monaco needs a real browser; a text box stands in for it.
vi.mock("@/components/coding/CodeEditor", () => ({
  CodeEditor: ({
    value,
    onChange,
    label,
    readOnly,
  }: {
    value: string;
    onChange?: (v: string) => void;
    label: string;
    readOnly?: boolean;
  }) => (
    <textarea
      aria-label={label}
      value={value}
      readOnly={readOnly}
      onChange={(e) => onChange?.(e.target.value)}
    />
  ),
}));

let calls: { path: string; init?: { method?: string; json?: unknown } }[] = [];
let respond: (path: string, init?: { method?: string; json?: unknown }) => unknown;
vi.mock("@/lib/api/client", () => ({
  api: async (path: string, init?: { method?: string; json?: unknown }) => {
    calls.push({ path, init });
    return respond(path, init);
  },
}));

const problem = {
  slug: "fizzbuzz",
  title: "FizzBuzz",
  difficulty: "EASY" as const,
  topics: ["math"],
  summary: "Print Fizz and Buzz.",
  statement: "Print Fizz and Buzz.",
  inputFormat: "One integer n.",
  outputFormat: "n lines.",
  constraints: ["1 ≤ n ≤ 1000"],
  samples: [{ input: "3\n", output: "1\n2\nFizz", explanation: null }],
  hiddenTests: 8,
};
const attempt = (over: Partial<Attempt> = {}): Attempt => ({
  id: "att1",
  applicationId: "app1",
  kind: "CODING",
  title: "FizzBuzz warm-up",
  timeLimitMin: 30,
  startedAt: new Date().toISOString(),
  deadline: new Date(Date.now() + 30 * 60_000).toISOString(),
  submittedAt: null,
  score: null,
  questions: [],
  answers: null,
  problem,
  code: null,
  ...over,
});

describe("CodingExam", () => {
  beforeEach(() => {
    calls = [];
    respond = () => attempt();
  });
  afterEach(() => vi.useRealTimers());

  it("starts, then shows the problem next to starter code", async () => {
    render(<CodingExam applicationId="app1" jobTitle="Engineer" initial={null} />);
    fireEvent.click(screen.getByRole("button", { name: "Start test" }));
    expect(await screen.findByRole("heading", { name: "FizzBuzz", level: 1 })).toBeInTheDocument();
    expect(screen.getByLabelText("Code editor")).toHaveValue(CODING_STARTER_CODE.python);
    expect(calls[0]!.path).toBe("/me/applications/app1/attempt");
  });

  it("swaps untouched starter code with the language, but keeps real work", () => {
    render(<CodingExam applicationId="app1" jobTitle="Engineer" initial={attempt()} />);
    const language = screen.getByLabelText("Language");
    fireEvent.change(language, { target: { value: "java" } });
    expect(screen.getByLabelText("Code editor")).toHaveValue(CODING_STARTER_CODE.java);

    fireEvent.change(screen.getByLabelText("Code editor"), { target: { value: "my work" } });
    fireEvent.change(language, { target: { value: "cpp" } });
    expect(screen.getByLabelText("Code editor")).toHaveValue("my work");
  });

  it("autosaves a moment after typing", async () => {
    vi.useFakeTimers();
    respond = () => undefined;
    render(<CodingExam applicationId="app1" jobTitle="Engineer" initial={attempt()} />);
    fireEvent.change(screen.getByLabelText("Code editor"), { target: { value: "print(1)" } });
    expect(calls).toHaveLength(0);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1600);
    });
    expect(calls[0]).toEqual({
      path: "/attempts/att1/draft",
      init: { method: "PUT", json: { language: "python", code: "print(1)" } },
    });
    expect(screen.getByText("All changes saved")).toBeInTheDocument();
  });

  it("submits language and code after confirming, then shows them read-only", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    respond = (path, init) =>
      path.endsWith("/submit")
        ? attempt({
            submittedAt: new Date().toISOString(),
            code: init!.json as { language: "python"; code: string },
          })
        : undefined;
    render(
      <CodingExam
        applicationId="app1"
        jobTitle="Engineer"
        initial={attempt({ code: { language: "python", code: "print(42)" } })}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Submit solution" }));
    expect(await screen.findByRole("heading", { name: "Solution submitted" })).toBeInTheDocument();
    const submit = calls.find((c) => c.path === "/attempts/att1/submit")!;
    expect(submit.init?.json).toEqual({ language: "python", code: "print(42)" });
    await waitFor(() =>
      expect(screen.getByLabelText("Your submitted code")).toHaveValue("print(42)"),
    );
  });
});
