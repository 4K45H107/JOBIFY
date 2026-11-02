"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import type { CompanyList, JobList } from "@jobify/shared";
import { CompanyLogo } from "@/components/company/CompanyLogo";
import { api } from "@/lib/api/client";
import { cn } from "@/lib/cn";
import { JOB_TYPE_LABELS } from "@/lib/labels";

const MIN_CHARS = 2;
const DEBOUNCE_MS = 250;

/** Where each role's results come from and lead to. */
const ROLES = {
  SEEKER: {
    placeholder: "Search jobs or companies",
    jobs: (q: string) => `/jobs?q=${q}&pageSize=5`,
    jobHref: (id: string) => `/jobs/${id}`,
    companyHref: (slug: string) => `/companies/${slug}`,
    allHref: (q: string) => `/explore/jobs?tab=search&q=${q}`,
    allLabel: "See all jobs for",
  },
  EMPLOYER: {
    placeholder: "Search your jobs or companies",
    jobs: (q: string) => `/employer/jobs?q=${q}&pageSize=5`,
    jobHref: (id: string) => `/employer/jobs/${id}`,
    companyHref: (slug: string) => `/employer/companies/${slug}`,
    allHref: (q: string) => `/employer/explore?q=${q}`,
    allLabel: "See all companies for",
  },
} as const;

interface Option {
  id: string;
  href: string;
  group: "Jobs" | "Companies" | null;
  title: string;
  detail?: string;
  logo?: { name: string; src: string | null };
}

interface Results {
  query: string;
  jobs: Option[];
  companies: Option[];
}

/** True when a key press is meant for a text field, not for a page shortcut. */
const typingIn = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

/**
 * Top-bar search: suggests a few jobs and companies as you type, with a link to the full
 * results. A combobox (arrow keys, Enter, Escape); "/" jumps to it. On phones it's an icon
 * that opens the box under the top bar.
 */
export function HeaderSearch({ role }: { role: keyof typeof ROLES }) {
  const config = ROLES[role];
  const router = useRouter();
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Results | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [mobileOpen, setMobileOpen] = useState(false);

  const term = query.trim();
  const ready = term.length >= MIN_CHARS;
  const encoded = encodeURIComponent(term);
  const allHref = config.allHref(encoded);

  // Suggestions, debounced; an older response never replaces a newer one.
  useEffect(() => {
    if (!ready) {
      setResults(null);
      return;
    }
    let stale = false;
    const timer = setTimeout(async () => {
      const [jobs, companies] = await Promise.allSettled([
        api<JobList>(config.jobs(encoded)),
        api<CompanyList>(`/companies?q=${encoded}&pageSize=4`),
      ]);
      if (stale) return;
      setFailed(jobs.status === "rejected" && companies.status === "rejected");
      setResults({
        query: term,
        jobs:
          jobs.status === "fulfilled"
            ? jobs.value.items.map((j) => ({
                id: `job-${j.id}`,
                href: config.jobHref(j.id),
                group: "Jobs",
                title: j.title,
                detail: `${j.company.name} · ${j.city ? `${j.city}, ` : ""}${j.country} · ${JOB_TYPE_LABELS[j.type]}`,
                logo: { name: j.company.name, src: j.company.logoUrl },
              }))
            : [],
        companies:
          companies.status === "fulfilled"
            ? companies.value.items.map((c) => ({
                id: `company-${c.id}`,
                href: config.companyHref(c.slug),
                group: "Companies",
                title: c.name,
                detail: [c.industry, `${c.openJobs} open ${c.openJobs === 1 ? "job" : "jobs"}`]
                  .filter(Boolean)
                  .join(" · "),
                logo: { name: c.name, src: c.logoUrl },
              }))
            : [],
      });
      setActive(-1);
    }, DEBOUNCE_MS);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [ready, term, encoded, config]);

  // A new page closes the search and clears it.
  useEffect(() => {
    setOpen(false);
    setMobileOpen(false);
    setQuery("");
  }, [pathname]);

  // "/" focuses the search from anywhere on the page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey || typingIn(e.target)) return;
      e.preventDefault();
      setMobileOpen(true);
      inputRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Clicking elsewhere closes the suggestions.
  useEffect(() => {
    if (!open && !mobileOpen) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      setOpen(false);
      setMobileOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, mobileOpen]);

  useEffect(() => {
    if (mobileOpen) inputRef.current?.focus();
  }, [mobileOpen]);

  const current = results && results.query === term ? results : null;
  const options: Option[] = current
    ? [
        ...current.jobs,
        ...current.companies,
        { id: "all", href: allHref, group: null, title: `${config.allLabel} “${term}”` },
      ]
    : [];
  const showList = open && ready;
  const optionId = (i: number) => `${listId}-${options[i]?.id}`;

  const go = (href: string) => {
    setOpen(false);
    setMobileOpen(false);
    inputRef.current?.blur();
    router.push(href);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!options.length) return;
      e.preventDefault();
      setOpen(true);
      const step = e.key === "ArrowDown" ? 1 : -1;
      // -1 is the text box itself, so the cycle passes back through it.
      setActive((i) => {
        const next = i + step;
        return next < -1 ? options.length - 1 : next >= options.length ? -1 : next;
      });
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (!ready) return;
      go(options[active]?.href ?? allHref);
      return;
    }
    if (e.key === "Escape") {
      if (open && ready) setOpen(false);
      else {
        setQuery("");
        setMobileOpen(false);
        inputRef.current?.blur();
      }
    }
  };

  let lastGroup: Option["group"] = null;

  return (
    <div ref={rootRef} className="flex items-center">
      <button
        type="button"
        aria-label={mobileOpen ? "Close search" : "Open search"}
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen((v) => !v)}
        className="rounded-full p-1 transition-opacity hover:opacity-80 md:hidden"
      >
        <Image src="/icons/search-white.svg" alt="" width={21} height={17} />
      </button>

      <div
        role="search"
        className={cn(
          "md:relative md:block md:w-72 lg:w-96",
          mobileOpen
            ? "fixed inset-x-0 top-14 z-40 block bg-chrome px-4 pb-3 md:top-0 md:bg-transparent md:p-0"
            : "hidden",
        )}
      >
        <label className="relative block">
          <span className="sr-only">{config.placeholder}</span>
          <Image
            src="/icons/search-white.svg"
            alt=""
            width={18}
            height={15}
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2"
          />
          <input
            ref={inputRef}
            type="search"
            role="combobox"
            aria-expanded={showList}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={showList && active >= 0 ? optionId(active) : undefined}
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="search"
            value={query}
            placeholder={config.placeholder}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            className="h-10 w-full rounded-full bg-chrome-fg/12 pr-10 pl-10 text-chrome-fg placeholder:text-chrome-fg/65 focus:bg-chrome-fg/18 focus:outline-2 focus:outline-chrome-fg/40 [&::-webkit-search-cancel-button]:hidden"
          />
          <kbd
            aria-hidden
            className={cn(
              "pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 rounded border border-chrome-fg/30 px-1.5 text-xs text-chrome-fg/70",
              !query && "md:block",
            )}
          >
            /
          </kbd>
        </label>

        {showList && (
          <div className="absolute inset-x-4 top-full z-40 mt-2 overflow-hidden rounded-[10px] border border-border bg-bg text-fg shadow-lg md:inset-x-0">
            {!current ? (
              <p className="px-4 py-3 text-sm text-fg-subtle" role="status">
                Searching…
              </p>
            ) : (
              <>
                {failed && (
                  <p className="px-4 pt-3 text-sm text-fg-subtle" role="status">
                    Search isn&apos;t available right now.
                  </p>
                )}
                {!failed && !current.jobs.length && !current.companies.length && (
                  <p className="px-4 pt-3 text-sm text-fg-subtle" role="status">
                    No matches for “{term}”.
                  </p>
                )}
                <ul id={listId} role="listbox" aria-label="Suggestions" className="py-1">
                  {options.map((option, i) => {
                    const heading = option.group !== lastGroup ? option.group : null;
                    lastGroup = option.group;
                    return (
                      <li key={option.id} role="presentation">
                        {heading && (
                          <p
                            role="presentation"
                            className="px-4 pt-2 pb-1 text-xs font-semibold tracking-label text-fg-subtle uppercase"
                          >
                            {heading}
                          </p>
                        )}
                        <Link
                          id={optionId(i)}
                          href={option.href}
                          role="option"
                          aria-selected={i === active}
                          tabIndex={-1}
                          onMouseEnter={() => setActive(i)}
                          onClick={(e) => {
                            e.preventDefault();
                            go(option.href);
                          }}
                          className={cn(
                            "flex items-center gap-3 px-4 py-2",
                            i === active && "bg-surface-grey",
                            option.group === null &&
                              "mt-1 border-t border-border py-3 text-sm text-link",
                          )}
                        >
                          {option.logo && (
                            <CompanyLogo
                              name={option.logo.name}
                              src={option.logo.src}
                              className="size-8 shrink-0 text-xs"
                            />
                          )}
                          <span className="min-w-0">
                            <span className="block truncate font-medium">{option.title}</span>
                            {option.detail && (
                              <span className="block truncate text-sm text-fg-subtle">
                                {option.detail}
                              </span>
                            )}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
