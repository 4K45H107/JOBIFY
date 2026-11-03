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

let calls: { path: string; init?: { method?: string; json?: unknown } }[] = [];
let saved = { notes: "", updatedAt: null as string | null, editable: true };
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
    saved = { notes: "", updatedAt: null, editable: true };
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
    expect(sendText).toHaveBeenCalledWith("Q1: REST", { topic: NOTES_TOPIC });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    expect(calls.find((c) => c.init?.method === "PUT")).toEqual({
      path: "/interviews/iv1/notes",
      init: { method: "PUT", json: { notes: "Q1: REST" } },
    });
    expect(screen.getByText(/Saved\. The interviewer sees what you type/)).toBeInTheDocument();
  });

  it("shows the interviewer the saved text, then live updates from the candidate only", async () => {
    saved = { notes: "Earlier answer", updatedAt: new Date().toISOString(), editable: false };
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
      handler({ readAll: async () => "Earlier answer\nQ2: index" }, { identity: "s1" });
    });
    expect(view).toHaveTextContent("Q2: index");
    expect(view).not.toHaveTextContent("Someone else");
    expect(onActivity).toHaveBeenCalledTimes(1);
    expect(calls.some((c) => c.init?.method === "PUT")).toBe(false);
  });
});
