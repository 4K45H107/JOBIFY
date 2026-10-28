/** Section ids for the profile pages. Kept out of the client components so server pages can read them. */
export const SEEKER_SECTIONS = [
  { id: "info", label: "My information" },
  { id: "cv", label: "CV" },
  { id: "preferences", label: "Job preferences" },
  { id: "account", label: "Account settings" },
] as const;
export type SeekerSectionId = (typeof SEEKER_SECTIONS)[number]["id"];

export const EMPLOYER_SECTIONS = [
  { id: "info", label: "My information" },
  { id: "account", label: "Account settings" },
] as const;
export type EmployerSectionId = (typeof EMPLOYER_SECTIONS)[number]["id"];

export function pickSection<T extends { id: string }>(
  sections: readonly T[],
  requested?: string,
): T["id"] {
  return sections.find((s) => s.id === requested)?.id ?? sections[0]!.id;
}
