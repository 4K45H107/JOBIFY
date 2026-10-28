import { grade, isLate } from "./grading";

const questions = [
  { id: "q1", correctIndex: 1 },
  { id: "q2", correctIndex: 0 },
  { id: "q3", correctIndex: 2 },
];

describe("grade", () => {
  it("scores correct answers as a percentage", () => {
    const { score, byQuestion } = grade(questions, [
      { questionId: "q1", optionIndex: 1 },
      { questionId: "q2", optionIndex: 3 },
    ]);
    expect(score).toBe(33.3);
    expect(byQuestion).toEqual({ q1: 1, q2: 3, q3: null });
  });

  it("ignores answers to questions that aren't in the test", () => {
    expect(grade(questions, [{ questionId: "other", optionIndex: 0 }]).score).toBe(0);
    expect(
      grade(
        questions,
        questions.map((q) => ({ questionId: q.id, optionIndex: q.correctIndex })),
      ).score,
    ).toBe(100);
  });
});

describe("isLate", () => {
  const started = new Date("2026-10-29T10:00:00Z");
  it("allows a one-minute grace after the limit", () => {
    expect(isLate(started, 10, new Date("2026-10-29T10:10:59Z"))).toBe(false);
    expect(isLate(started, 10, new Date("2026-10-29T10:11:01Z"))).toBe(true);
  });
});
