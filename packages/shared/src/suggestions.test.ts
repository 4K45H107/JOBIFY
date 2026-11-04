import { describe, expect, it } from "vitest";
import {
  CITIES,
  cityOptions,
  COUNTRIES,
  JOB_TITLES,
  LOCATIONS,
  matchSuggestions,
  SKILLS,
} from "./suggestions";

describe("matchSuggestions", () => {
  it("puts options that start with the text first", () => {
    expect(matchSuggestions("ban", COUNTRIES)).toEqual(["Bangladesh"]);
    expect(matchSuggestions("in", COUNTRIES)).toEqual(["India", "Indonesia"]);
  });

  it("then options with a later word starting with it, never the middle of a word", () => {
    expect(matchSuggestions("king", COUNTRIES)).toEqual(["United Kingdom"]);
    expect(matchSuggestions("native", SKILLS)).toEqual(["React Native"]);
    expect(matchSuggestions("script", SKILLS)).toEqual([]);
    expect(matchSuggestions("dev", JOB_TITLES, { limit: 2 })).toEqual([
      "DevOps Engineer",
      "Developer Advocate",
    ]);
  });

  it("ignores case and leaves out what's already chosen or typed in full", () => {
    expect(matchSuggestions("REACT", SKILLS)).toEqual(["React Native"]);
    expect(matchSuggestions("re", ["React", "Redux", "Redis"], { exclude: ["redux"] })).toEqual([
      "React",
      "Redis",
    ]);
  });

  it("shows the first options when nothing is typed, and nothing for nonsense", () => {
    expect(matchSuggestions("", COUNTRIES, { limit: 2 })).toEqual(["Afghanistan", "Albania"]);
    expect(matchSuggestions("zzq", COUNTRIES)).toEqual([]);
  });
});

describe("word lists", () => {
  it("have no duplicates, and every city's country is a known country", () => {
    for (const list of [COUNTRIES, JOB_TITLES, SKILLS, LOCATIONS]) {
      expect(new Set(list.map((v) => v.toLowerCase())).size).toBe(list.length);
    }
    for (const c of CITIES) expect(COUNTRIES).toContain(c.country);
    expect(LOCATIONS).toContain("Dhaka, Bangladesh");
  });
});

describe("cityOptions", () => {
  it("lists the chosen country's cities, or all cities for an unknown country", () => {
    expect(cityOptions("bangladesh")).toContain("Dhaka");
    expect(cityOptions("Bangladesh")).not.toContain("London");
    expect(cityOptions("")).toContain("London");
    expect(new Set(cityOptions("")).size).toBe(cityOptions("").length);
  });
});
