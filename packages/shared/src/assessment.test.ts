import { describe, expect, it } from "vitest";
import { assessmentInput, mcqQuestionInput } from "./assessment";

describe("mcqQuestionInput", () => {
  const q = {
    prompt: "What is the SI unit of power?",
    options: ["Joule", "Watt"],
    correctIndex: 1,
  };

  it("accepts a well-formed question", () => {
    expect(mcqQuestionInput.parse(q)).toEqual(q);
  });

  it("requires the correct answer to be one of the options", () => {
    expect(mcqQuestionInput.safeParse({ ...q, correctIndex: 2 }).success).toBe(false);
  });

  it("rejects duplicate options and too few options", () => {
    expect(mcqQuestionInput.safeParse({ ...q, options: ["Watt", "watt"] }).success).toBe(false);
    expect(mcqQuestionInput.safeParse({ ...q, options: ["Watt"], correctIndex: 0 }).success).toBe(
      false,
    );
  });
});

describe("assessmentInput", () => {
  it("needs at least one question and a sane time limit", () => {
    expect(
      assessmentInput.safeParse({ title: "Test", timeLimitMin: 10, questions: [] }).success,
    ).toBe(false);
    expect(
      assessmentInput.safeParse({
        title: "Test",
        timeLimitMin: 0,
        questions: [{ prompt: "Hello there?", options: ["a", "b"], correctIndex: 0 }],
      }).success,
    ).toBe(false);
  });
});
