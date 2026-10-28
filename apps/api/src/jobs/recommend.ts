import type { JobType, Workplace } from "@jobify/shared";

export interface SeekerSignals {
  titles: string[];
  locations: string[];
  jobTypes: JobType[];
  workplace: Workplace[];
  minSalary: number | null;
  skills: string[];
  /** Whole years; null when the seeker hasn't set a birthdate. */
  age: number | null;
}

export interface JobSignals {
  title: string;
  type: JobType;
  workplace: Workplace;
  country: string;
  city: string | null;
  salaryMax: number;
  ageMin: number | null;
  ageMax: number | null;
  skills: string[];
}

export interface Score {
  score: number;
  reasons: string[];
  /** False when the seeker can't apply (e.g. outside the age range). */
  eligible: boolean;
}

const words = (s: string) =>
  s
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .filter((w) => w.length > 1);
const lower = (list: string[]) => new Set(list.map((s) => s.toLowerCase()));

/**
 * Rule-based "For You" score (v1). Each signal adds points and a human-readable reason.
 * The 2024 version matched job titles against a hard-coded category list; this uses the
 * seeker's own preferences and skills instead.
 */
export function scoreJob(seeker: SeekerSignals, job: JobSignals): Score {
  const reasons: string[] = [];
  let score = 0;

  if (
    seeker.age !== null &&
    ((job.ageMin !== null && seeker.age < job.ageMin) ||
      (job.ageMax !== null && seeker.age > job.ageMax))
  ) {
    return { score: 0, reasons: [], eligible: false };
  }

  const jobWords = new Set(words(job.title));
  const titleHit = seeker.titles.find((t) => {
    const want = words(t);
    return want.length > 0 && want.every((w) => jobWords.has(w));
  });
  const partialTitle =
    !titleHit && seeker.titles.some((t) => words(t).some((w) => jobWords.has(w)));
  if (titleHit) {
    score += 5;
    reasons.push(`Matches “${titleHit}”`);
  } else if (partialTitle) {
    score += 2;
    reasons.push("Similar to the roles you want");
  }

  const mySkills = lower(seeker.skills);
  const shared = job.skills.filter((s) => mySkills.has(s.toLowerCase()));
  if (shared.length > 0) {
    score += Math.min(shared.length, 4) * 2;
    reasons.push(`Uses ${shared.slice(0, 3).join(", ")}`);
  }

  const places = lower(seeker.locations);
  const inPlace =
    places.has(job.country.toLowerCase()) ||
    (job.city !== null && places.has(job.city.toLowerCase()));
  if (job.workplace === "REMOTE" && seeker.workplace.includes("REMOTE")) {
    score += 2;
    reasons.push("Remote");
  } else if (inPlace) {
    score += 2;
    reasons.push(`In ${job.city ?? job.country}`);
  }

  if (seeker.jobTypes.includes(job.type)) score += 1;
  if (seeker.workplace.includes(job.workplace) && job.workplace !== "REMOTE") score += 1;

  if (seeker.minSalary !== null) {
    if (job.salaryMax >= seeker.minSalary) {
      score += 1;
      reasons.push("Meets your salary");
    } else {
      score -= 3;
    }
  }

  return { score, reasons, eligible: true };
}

export function ageOn(birthdate: Date | null, today = new Date()): number | null {
  if (!birthdate) return null;
  let age = today.getUTCFullYear() - birthdate.getUTCFullYear();
  const beforeBirthday =
    today.getUTCMonth() < birthdate.getUTCMonth() ||
    (today.getUTCMonth() === birthdate.getUTCMonth() &&
      today.getUTCDate() < birthdate.getUTCDate());
  return beforeBirthday ? age - 1 : age;
}
