import type { Metadata } from "next";
import Link from "next/link";
import { type JobList, jobSearchQuerySchema, type RecommendedJob } from "@jobify/shared";
import { JobBrowser } from "@/components/jobs/JobBrowser";
import { JobCardList } from "@/components/jobs/JobCardList";
import { SearchFilters } from "@/components/jobs/SearchFilters";
import { Pagination } from "@/components/ui/Pagination";
import { PillTabs } from "@/components/ui/SegmentedTabs";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { serverApi } from "@/lib/api/server";

export const metadata: Metadata = { title: "Explore jobs" };

type Params = Record<string, string | undefined>;

export default async function ExploreJobsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const tab = params.tab === "search" ? "search" : "for-you";

  return (
    <div className="flex flex-col gap-6">
      <PillTabs
        tabs={[
          { label: "For You", href: "/explore/jobs", active: tab === "for-you" },
          { label: "Search", href: "/explore/jobs?tab=search", active: tab === "search" },
        ]}
      />
      {tab === "for-you" ? <ForYou /> : <Search params={params} />}
    </div>
  );
}

async function ForYou() {
  const jobs = await serverApi<RecommendedJob[]>("/jobs/for-you");
  return (
    <JobBrowser
      jobs={jobs}
      emptyMessage={
        <>
          No matches yet. Add your{" "}
          <Link href="/settings?section=preferences" className="text-link underline">
            job preferences
          </Link>{" "}
          and{" "}
          <Link href="/settings" className="text-link underline">
            skills
          </Link>{" "}
          to get recommendations, or{" "}
          <Link href="/explore/jobs?tab=search" className="text-link underline">
            browse all jobs
          </Link>
          .
        </>
      }
    />
  );
}

async function Search({ params }: { params: Params }) {
  const query = jobSearchQuerySchema.safeParse(params);
  const q = query.success ? query.data : jobSearchQuerySchema.parse({});
  const filtered = Boolean(
    q.q || q.type.length || q.workplace.length || q.location || q.company || q.salary !== undefined,
  );
  const qs = (extra: Params) => {
    const merged: Params = { ...params, tab: undefined, ...extra };
    const entries = Object.entries(merged).filter(
      (entry): entry is [string, string] => entry[1] !== undefined,
    );
    return new URLSearchParams(entries).toString();
  };

  const filters = (
    <SearchFilters
      initial={{
        q: q.q ?? "",
        type: q.type,
        workplace: q.workplace,
        location: q.location ?? "",
        company: q.company ?? "",
        salary: q.salary?.toString() ?? "",
        sort: q.sort,
      }}
    />
  );

  if (!filtered) {
    // Figma: TRENDING on top, then LATEST.
    const [trending, latest] = await Promise.all([
      serverApi<JobList>(`/jobs?${qs({ sort: "trending", pageSize: "3", page: "1" })}`),
      serverApi<JobList>(`/jobs?${qs({ sort: "latest", pageSize: "10" })}`),
    ]);
    return (
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="flex flex-col gap-8">
          <section aria-labelledby="trending">
            <SectionHeading id="trending" className="mb-2">
              Trending
            </SectionHeading>
            <JobCardList jobs={trending.items} emptyMessage="Nothing trending yet." />
          </section>
          <section aria-labelledby="latest">
            <SectionHeading id="latest" className="mb-2">
              Latest
            </SectionHeading>
            <JobCardList jobs={latest.items} emptyMessage="No open jobs yet." />
            <Pagination
              page={latest.page}
              pageSize={latest.pageSize}
              total={latest.total}
              basePath="/explore/jobs"
              params={{ ...params, tab: "search" }}
            />
          </section>
        </div>
        <aside className="order-first xl:order-last">{filters}</aside>
      </div>
    );
  }

  const results = await serverApi<JobList>(`/jobs?${qs({})}`);
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
      <section aria-labelledby="results" className="flex flex-col gap-2">
        <SectionHeading id="results">
          {results.total} {results.total === 1 ? "job" : "jobs"} found
        </SectionHeading>
        <JobCardList
          jobs={results.items}
          emptyMessage="No jobs match these filters. Try removing some."
        />
        <Pagination
          page={results.page}
          pageSize={results.pageSize}
          total={results.total}
          basePath="/explore/jobs"
          params={{ ...params, tab: "search" }}
        />
      </section>
      <aside className="order-first xl:order-last">{filters}</aside>
    </div>
  );
}
