export interface NavItem {
  label: string;
  href: string;
  /** Icon in /public/icons (exported from Figma). */
  icon: string;
  /** Route prefix that marks this item active. Defaults to an exact match on href. */
  matchPrefix?: string;
}

/** Seeker sidebar (Figma: Explore / Activities / Interviews frames). */
export const seekerNav: NavItem[] = [
  { label: "Home", href: "/", icon: "/icons/home.png" },
  { label: "Explore", href: "/explore/jobs", icon: "/icons/search.png", matchPrefix: "/explore" },
  {
    label: "Activities",
    href: "/activities",
    icon: "/icons/bookmark.png",
    matchPrefix: "/activities",
  },
  {
    label: "Interviews",
    href: "/interviews",
    icon: "/icons/interview.png",
    matchPrefix: "/interviews",
  },
  { label: "Settings", href: "/settings", icon: "/icons/settings.png", matchPrefix: "/settings" },
];

/** Employer sidebar (Figma: Employer Home frame). */
export const employerNav: NavItem[] = [
  { label: "Home", href: "/employer", icon: "/icons/home.png" },
  {
    label: "Add Jobs",
    href: "/employer/jobs/new",
    icon: "/icons/bookmark.png",
    matchPrefix: "/employer/jobs",
  },
  {
    label: "Explore",
    href: "/employer/explore",
    icon: "/icons/search.png",
    matchPrefix: "/employer/explore",
  },
  {
    label: "My Company",
    href: "/employer/company",
    icon: "/icons/team.png",
    matchPrefix: "/employer/company",
  },
  {
    label: "Interview schedule",
    href: "/employer/interviews",
    icon: "/icons/schedule.png",
    matchPrefix: "/employer/interviews",
  },
  {
    label: "Settings",
    href: "/employer/settings",
    icon: "/icons/settings.png",
    matchPrefix: "/employer/settings",
  },
];

export function isNavItemActive(pathname: string, item: NavItem): boolean {
  if (!item.matchPrefix) return pathname === item.href;
  return pathname === item.matchPrefix || pathname.startsWith(`${item.matchPrefix}/`);
}
