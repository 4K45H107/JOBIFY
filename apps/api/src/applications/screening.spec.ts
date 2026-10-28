import { checkScreeningAnswers, type QuestionRule } from "./screening";

const questions: QuestionRule[] = [
  { id: "auth", prompt: "Authorized?", kind: "YES_NO", required: true },
  { id: "years", prompt: "Years?", kind: "NUMBER", required: true },
  { id: "note", prompt: "Anything else?", kind: "TEXT", required: false },
];

describe("checkScreeningAnswers", () => {
  it("normalises valid answers and skips empty optional ones", () => {
    const result = checkScreeningAnswers(questions, [
      { questionId: "auth", answer: " YES " },
      { questionId: "years", answer: "03" },
      { questionId: "note", answer: "" },
    ]);
    expect(result.errors).toEqual({});
    expect(result.normalised).toEqual([
      { questionId: "auth", answer: "yes" },
      { questionId: "years", answer: "3" },
    ]);
  });

  it("reports missing, malformed and unknown answers", () => {
    const { errors } = checkScreeningAnswers(questions, [
      { questionId: "auth", answer: "maybe" },
      { questionId: "years", answer: "-2" },
      { questionId: "hacked", answer: "x" },
    ]);
    expect(errors).toEqual({
      auth: "Answer yes or no",
      years: "Enter a number",
      hacked: "Not a question for this job",
    });
    expect(checkScreeningAnswers(questions, []).errors).toMatchObject({
      auth: expect.any(String),
      years: expect.any(String),
    });
  });
});
