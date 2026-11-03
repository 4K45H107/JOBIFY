import { act, fireEvent, render, screen } from "@testing-library/react";
import { NOTES_TOPIC } from "@jobify/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InterviewNotepad } from "./InterviewNotepad";

type Handler = (reader: { readAll: () => Promise<string> }, from: { identity: string }) => void;
const handlers = new Map<string, Handler>();
const sendText = vi.fn(async () => ({}));
const room = {
  localParticipant: { sendText },
  registerTextStreamHandler: (topic: string, h: Handler) => handlers.set(topic, h),
  unregisterTextStreamHandler: (topic: string) => handlers.delete(topic),
  on: vi.fn(),
  off: vi.fn(),
};
vi.mock("@livekit/components-react", () => ({ useRoomContext: () => room }));
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
let saved = {
  notes: "",
  language: null as string | null,
  updatedAt: null as string | null,
  editable: true,
};
vi.mock("@/lib/api/client", () => ({
  api: async (path: string, init?: { method?: string; json?: unknown }) => {
    calls.push({ path, init });
    return init?.method === "PUT" ? undefined : saved;
  },
}));

describe("InterviewNotepad", () => {
  beforeEach(() => {
    calls = [];
    handlers.clear();
    sendText.mockClear();
    saved = { notes: "", language: null, updatedAt: null, editable: true };
  });
  afterEach(() => vi.useRealTimers());

  it("sends the candidate's text live and autosaves it", async () => {
    vi.useFakeTimers();
    render(<InterviewNotepad interviewId="iv1" viewer="SEEKER" seekerId="s1" />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    fireEvent.change(screen.getByLabelText("Your notes"), { target: { value: "Q1: REST" } });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(sendText).toHaveBeenCalledWith(JSON.stringify({ notes: "Q1: REST", language: null }), {
      topic: NOTES_TOPIC,
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    expect(calls.find((c) => c.init?.method === "PUT")).toEqual({
      path: "/interviews/iv1/notes",
      init: { method: "PUT", json: { notes: "Q1: REST", language: null } },
    });
    expect(screen.getByText(/Saved\. The interviewer sees what you type/)).toBeInTheDocument();
  });

  it("shows the interviewer the saved text, then live updates from the candidate only", async () => {
    saved = {
      notes: "Earlier answer",
      language: null,
      updatedAt: new Date().toISOString(),
      editable: false,
    };
    const onActivity = vi.fn();
    render(
      <InterviewNotepad
        interviewId="iv1"
        viewer="EMPLOYER"
        seekerId="s1"
        onActivity={onActivity}
      />,
    );
    const view = screen.getByRole("region", { name: "The candidate's notes" });
    expect(await screen.findByText("Earlier answer")).toBeInTheDocument();
    expect(screen.queryByLabelText("Your notes")).not.toBeInTheDocument();

    const handler = handlers.get(NOTES_TOPIC)!;
    await act(async () => {
      handler({ readAll: async () => "Someone else" }, { identity: "intruder" });
      handler(
        {
          readAll: async () =>
            JSON.stringify({ notes: "Earlier answer\nQ2: index", language: null }),
        },
        { identity: "s1" },
      );
    });
    expect(view).toHaveTextContent("Q2: index");
    expect(view).not.toHaveTextContent("Someone else");
    expect(onActivity).toHaveBeenCalledTimes(1);
    expect(calls.some((c) => c.init?.method === "PUT")).toBe(false);
  });

  it("switches to code mode: highlighted for both, language sent and saved", async () => {
    vi.useFakeTimers();
    render(<InterviewNotepad interviewId="iv1" viewer="SEEKER" seekerId="s1" />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    fireEvent.change(screen.getByLabelText("Your notes"), { target: { value: "def f():" } });
    fireEvent.change(screen.getByLabelText("Mode"), { target: { value: "python" } });
    // The same text, now in the code editor.
    expect(screen.getByLabelText("Your code")).toHaveValue("def f():");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    const payload = { notes: "def f():", language: "python" };
    expect(sendText).toHaveBeenLastCalledWith(JSON.stringify(payload), { topic: NOTES_TOPIC });
    expect(calls.filter((c) => c.init?.method === "PUT").at(-1)?.init?.json).toEqual(payload);
  });

  it("shows the interviewer code read-only in its language", async () => {
    render(<InterviewNotepad interviewId="iv1" viewer="EMPLOYER" seekerId="s1" />);
    await act(async () => {
      handlers.get(NOTES_TOPIC)!(
        { readAll: async () => JSON.stringify({ notes: "int main() {}", language: "cpp" }) },
        { identity: "s1" },
      );
    });
    const code = await screen.findByLabelText("The candidate's code");
    expect(code).toHaveValue("int main() {}");
    expect(code).toHaveAttribute("readonly");
    expect(screen.getByText(/C\+\+17/)).toBeInTheDocument();
  });
});
