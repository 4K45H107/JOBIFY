import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { PlatformStats, RecommendedJob } from "@jobify/shared";
import { JobCardList } from "@/components/jobs/JobCardList";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { serverApi } from "@/lib/api/server";

export const metadata: Metadata = { title: "Home" };

const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

/** Figma "Home": "Your Job Searching starts here", job + location search, illustration and stats. */
export default async function HomePage() {
  const [stats, forYou] = await Promise.all([
    serverApi<PlatformStats>("/stats"),
    serverApi<RecommendedJob[]>("/jobs/for-you"),
  ]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-12 py-4 md:py-10">
      <section className="grid items-center gap-10 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-semibold text-hero md:text-3xl">
            Your <span className="text-3xl md:text-4xl">Job Searching</span> starts here
          </h1>
          <p className="text-fg-muted">Find yourself a suitable job</p>

          <form
            action="/explore/jobs"
            className="flex w-full max-w-xl overflow-hidden rounded-full bg-[#c9c3c3] text-[#2c2d2f]"
          >
            <input type="hidden" name="tab" value="search" />
            <label className="flex flex-1 items-center gap-2 px-4">
              <Image src="/icons/search.png" alt="" width={24} height={24} />
              <span className="sr-only">Job title, skill or company</span>
              <input
                name="q"
                placeholder="your preferred job"
                className="h-12 w-full bg-transparent text-sm placeholder:text-[#4a4a4a] focus:outline-none"
              />
            </label>
            <label className="flex w-40 items-center gap-2 border-l border-bg px-3">
              <Image src="/icons/location.png" alt="" width={16} height={16} />
              <span className="sr-only">Location</span>
              <input
                name="location"
                placeholder="location"
                className="h-12 w-full bg-transparent text-sm placeholder:text-[#4a4a4a] focus:outline-none"
              />
            </label>
            <button type="submit" className="sr-only">
              Search
            </button>
          </form>

          <dl className="mt-6 flex flex-wrap gap-10">
            {(
              [
                [stats.openJobs, "Open", "jobs"],
                [stats.companies, "", "Companies"],
                [stats.seekers, "Job", "enthusiasts"],
              ] as const
            ).map(([value, top, bottom]) => (
              <div key={bottom} className="flex items-end gap-1">
                <dd className="text-4xl font-light">{compact.format(value)}</dd>
                <dt className="text-sm leading-tight">
                  {top && <span className="block">{top}</span>}
                  {bottom}
                </dt>
              </div>
            ))}
          </dl>
        </div>
        <Image
          src="/illustrations/interview.jpg"
          alt=""
          width={538}
          height={225}
          priority
          className="icon-themed mx-auto w-full max-w-md mix-blend-multiply dark:mix-blend-normal"
        />
      </section>

      <section aria-labelledby="for-you" className="flex flex-col gap-2">
        <div className="flex items-end justify-between">
          <SectionHeading id="for-you">For you</SectionHeading>
          <Link href="/explore/jobs" className="text-sm text-link hover:underline">
            See all
          </Link>
        </div>
        <JobCardList
          jobs={forYou.slice(0, 3)}
          emptyMessage={
            <>
              Add your{" "}
              <Link href="/settings?section=preferences" className="text-link underline">
                job preferences
              </Link>{" "}
              to see jobs picked for you.
            </>
          }
        />
      </section>
    </div>
  );
}
