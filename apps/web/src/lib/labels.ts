import type { EmploymentStatus, JobType, Workplace } from "@jobify/shared";

export const EMPLOYMENT_LABELS: Record<EmploymentStatus, string> = {
  STUDENT: "Student",
  EMPLOYED: "Employed",
  UNEMPLOYED: "Looking for work",
  FREELANCE: "Freelancer",
};

export const JOB_TYPE_LABELS: Record<JobType, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACT: "Contract",
  INTERNSHIP: "Internship",
};

export const WORKPLACE_LABELS: Record<Workplace, string> = {
  ONSITE: "On-site",
  REMOTE: "Remote",
  HYBRID: "Hybrid",
};

export const options = <T extends string>(labels: Record<T, string>) =>
  (Object.entries(labels) as [T, string][]).map(([value, label]) => ({ value, label }));
