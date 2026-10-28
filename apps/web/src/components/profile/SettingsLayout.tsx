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
      <aside className="flex flex-col items-center gap-4 bg-sidebar/60 px-6 py-8 text-center lg:w-[260px] lg:shrink-0">
        <Avatar src={photoUrl} alt={`${name}'s photo`} className="size-32 md:size-[140px]" />
        {photoAction}
        <div>
          <p className="text-xl font-medium tracking-label uppercase">{name}</p>
          <p className="text-sm text-fg-subtle">{email}</p>
        </div>
        <nav aria-label="Profile sections" className="mt-2 w-full">
          <ul className="flex flex-wrap justify-center gap-2 lg:flex-col lg:items-end lg:gap-1">
            {sections.map((section) => (
              <li key={section.id}>
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
