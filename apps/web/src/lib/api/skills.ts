import { api } from "./client";

/** Skills already used on Jobify that match what's typed, for the skills suggestions. */
export const searchSkills = (q: string) => api<string[]>(`/skills?q=${encodeURIComponent(q)}`);
