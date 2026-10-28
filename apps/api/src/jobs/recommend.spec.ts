import { ageOn, type JobSignals, scoreJob, type SeekerSignals } from "./recommend";

const seeker: SeekerSignals = {
  titles: ["Frontend Developer"],
  locations: ["Dhaka"],
  jobTypes: ["FULL_TIME"],
  workplace: ["REMOTE", "HYBRID"],
  minSalary: 50_000,
  skills: ["React", "TypeScript"],
  age: 27,
};

const job: JobSignals = {
  title: "Senior Frontend Developer",
  type: "FULL_TIME",
  workplace: "HYBRID",
  country: "Bangladesh",
  city: "Dhaka",
  salaryMax: 80_000,
  ageMin: null,
  ageMax: null,
  skills: ["react", "Next.js"],
};

describe("scoreJob", () => {
  it("rewards title, skills, location, type, workplace and salary, with reasons", () => {
    const { score, reasons, eligible } = scoreJob(seeker, job);
    expect(eligible).toBe(true);
    expect(score).toBe(5 + 2 + 2 + 1 + 1 + 1);
    expect(reasons).toEqual([
      "Matches “Frontend Developer”",
      "Uses react",
      "In Dhaka",
      "Meets your salary",
    ]);
  });

  it("ranks an unrelated job lower and penalises low pay", () => {
    const other = scoreJob(seeker, {
      ...job,
      title: "Sales Executive",
      skills: ["Sales"],
      city: "London",
      country: "UK",
      salaryMax: 30_000,
    });
    expect(other.score).toBeLessThan(scoreJob(seeker, job).score);
    expect(other.score).toBeLessThan(0);
  });

  it("treats remote jobs as matching any location when the seeker wants remote", () => {
    const remote = scoreJob(seeker, {
      ...job,
      workplace: "REMOTE",
      city: "Berlin",
      country: "Germany",
    });
    expect(remote.reasons).toContain("Remote");
  });

  it("gives partial credit for overlapping title words", () => {
    expect(scoreJob(seeker, { ...job, title: "Backend Developer" }).reasons).toContain(
      "Similar to the roles you want",
    );
  });

  it("excludes jobs outside the seeker's age range", () => {
    expect(scoreJob(seeker, { ...job, ageMax: 25 }).eligible).toBe(false);
    expect(scoreJob({ ...seeker, age: null }, { ...job, ageMax: 25 }).eligible).toBe(true);
  });
});

describe("ageOn", () => {
  it("counts whole years and handles birthdays later in the year", () => {
    const today = new Date("2026-10-29T00:00:00Z");
    expect(ageOn(new Date("1999-10-29T00:00:00Z"), today)).toBe(27);
    expect(ageOn(new Date("1999-10-30T00:00:00Z"), today)).toBe(26);
    expect(ageOn(null, today)).toBeNull();
  });
});
