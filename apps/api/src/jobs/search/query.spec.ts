import { describe, expect, it } from "vitest";
import { parseSearch, typoAllowance } from "./query";

describe("parseSearch", () => {
  it("drops filler words and keeps the rest as terms", () => {
    expect(parseSearch("Remote React jobs in Dhaka").map((t) => t.text)).toEqual([
      "remote",
      "react",
      "dhaka",
    ]);
  });

  it("adds synonyms, matching multi-word phrases first", () => {
    const [swe, ...rest] = parseSearch("software engineer");
    expect(rest).toEqual([]);
    expect(swe!.alternatives).toEqual(["software engineer", "swe", "software developer", "sde"]);
    expect(parseSearch("front end dev").map((t) => t.text)).toEqual(["front end", "dev"]);
    expect(parseSearch("ML")[0]!.alternatives).toContain("machine learning");
    expect(parseSearch("engineers")[0]!.alternatives).toContain("developer");
  });

  it("keeps symbols that belong to a word, and strips stray punctuation", () => {
    expect(parseSearch("C++, node.js & C#!").map((t) => t.text)).toEqual(["c++", "node.js", "c#"]);
  });

  it("ignores repeats, empty input and very long queries", () => {
    expect(parseSearch("react react")).toHaveLength(1);
    expect(parseSearch("   ")).toEqual([]);
    expect(parseSearch("a b c d e f g h i j k l")).toHaveLength(6);
  });
});

describe("typoAllowance", () => {
  it("allows no typo in short words, one in medium and two in long ones", () => {
    expect(["sql", "react", "python"].map(typoAllowance)).toEqual([0, 1, 2]);
  });
});
