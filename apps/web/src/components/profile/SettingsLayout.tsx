import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/cn";

export interface SettingsSection {
  id: string;
  label: string;
}

/**
 * Figma "Profile" frame: an inner grey panel with the avatar, name and section links,
 * next to the active section. Stacks on small screens.
 */
export function SettingsLayout({
  name,
  email,
  photoUrl,
  photoAction,
  sections,
  active,
  basePath,
  children,
}: {
  name: string;
  email: string;
  photoUrl: string | null;
  photoAction: React.ReactNode;
  sections: SettingsSection[];
  active: string;
  basePath: string;
  children: React.ReactNode;
}) {
  return (
    <div className="-mx-4 -my-6 flex min-h-[calc(100%+3rem)] flex-col md:-mx-10 md:-my-8 md:min-h-[calc(100%+4rem)] lg:flex-row">
      <h1 className="sr-only">Profile</h1>
      {/* Phones: a compact row (photo, name, button) and one scrollable line of sections, so the
          section itself starts on the first screen. Desktop: the Figma column. */}
      <aside className="flex flex-col gap-4 bg-sidebar/60 px-4 py-4 lg:w-[260px] lg:shrink-0 lg:items-center lg:px-6 lg:py-8 lg:text-center">
        <div className="flex items-center gap-4 lg:flex-col">
          <Avatar
            src={photoUrl}
            name={name}
            alt={`${name}'s photo`}
            className="size-16 shrink-0 lg:size-[140px]"
          />
          <div className="flex min-w-0 flex-col items-start gap-2 lg:items-center lg:gap-4">
            <div className="min-w-0 lg:order-2">
              <p className="truncate text-lg font-medium tracking-label uppercase lg:text-xl lg:whitespace-normal">
                {name}
              </p>
              <p className="truncate text-sm text-fg-muted">{email}</p>
            </div>
            <div className="lg:order-1">{photoAction}</div>
          </div>
        </div>
        <nav aria-label="Profile sections" className="-mx-4 w-auto lg:mx-0 lg:mt-2 lg:w-full">
          <ul className="flex gap-2 overflow-x-auto px-4 pb-1 lg:flex-col lg:items-end lg:gap-1 lg:overflow-visible lg:px-0 lg:pb-0">
            {sections.map((section) => (
              <li key={section.id} className="shrink-0 whitespace-nowrap">
                <Link
                  href={`${basePath}?section=${section.id}`}
                  aria-current={section.id === active ? "page" : undefined}
                  className={cn(
                    "block rounded-[8px] px-3 py-1.5 tracking-label transition",
                    section.id === active ? "bg-primary text-primary-fg" : "hover:bg-bg/60",
                  )}
                >
                  {section.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      <div className="min-w-0 flex-1 px-4 py-6 md:px-10 md:py-8">{children}</div>
    </div>
  );
}
