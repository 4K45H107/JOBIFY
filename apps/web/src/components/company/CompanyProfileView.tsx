import { notFound } from "next/navigation";
import { type CompanyDetail, COMPANY_SIZE_LABELS, type JobList } from "@jobify/shared";
import { CompanyLogo } from "@/components/company/CompanyLogo";
import { JobCardList } from "@/components/jobs/JobCardList";
import { Card, CardHeader } from "@/components/ui/Card";
import { ApiError } from "@/lib/api/errors";
import { serverApi } from "@/lib/api/server";

export async function loadCompany(slug: string): Promise<CompanyDetail> {
  try {
    return await serverApi<CompanyDetail>(`/companies/${slug}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
}

/** Figma "Company Profile" (seeker view): cover, logo, stats, overview, offices and open jobs. */
export async function CompanyProfileView({
  slug,
  jobHrefBase,
}: {
  slug: string;
  jobHrefBase: string;
}) {
  const company = await loadCompany(slug);
  const jobs = await serverApi<JobList>(
    `/jobs?${new URLSearchParams({ companySlug: company.slug, pageSize: "50" })}`,
  );
  const openJobs = jobs.items;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <section>
        <div className="h-40 overflow-hidden rounded-[10px] bg-surface-muted md:h-64">
          {company.coverUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={company.coverUrl} alt="" className="size-full object-cover" />
          )}
        </div>
        <div className="-mt-12 flex flex-col items-start gap-2 px-4 md:-mt-16 md:flex-row md:items-end md:gap-4 md:px-8">
          <CompanyLogo
            name={company.name}
            src={company.logoUrl}
            className="size-24 border border-border text-3xl shadow-sm md:size-36 md:rounded-[20px] md:text-5xl"
          />
          <h1 className="text-2xl font-semibold tracking-label break-words uppercase md:pb-2 md:text-3xl">
            {company.name}
          </h1>
        </div>
      </section>

      <nav
        aria-label="Company stats"
        className="grid grid-cols-4 divide-x divide-fg md:flex md:px-2"
      >
        <span className="self-center text-lg md:pr-6 md:text-xl">Overview</span>
        {(
          [
            ["Open jobs", company.openJobs],
            ["On Jobify", company.employees],
            ["Offices", company.branches.length],
          ] as const
        ).map(([label, value]) => (
          <span key={label} className="px-2 text-center md:px-6">
            <span className="block text-xl font-medium">{value}</span>
            <span className="block text-xs text-success">{label}</span>
          </span>
        ))}
      </nav>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card>
          <CardHeader title={`${company.name} overview`} />
          {company.website && (
            <a
              href={company.website}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-success underline"
            >
              {company.website.replace(/^https?:\/\//, "")}
            </a>
          )}
          <ul className="mt-3 list-disc pl-5 text-sm text-fg-muted">
            {company.size && <li>{COMPANY_SIZE_LABELS[company.size]}</li>}
            {company.industry && <li>Industry: {company.industry}</li>}
            {company.foundedYear && <li>Founded in {company.foundedYear}</li>}
            {company.headquarters && <li>Headquarters: {company.headquarters}</li>}
          </ul>
          <p className="mt-4 whitespace-pre-line text-fg-muted">
            {company.description ?? "No overview yet."}
          </p>
          {company.mission && (
            <p className="mt-4 text-sm">
              <span className="font-semibold">Mission:</span> {company.mission}
            </p>
          )}
        </Card>
        <Card>
          <CardHeader title="Offices" />
          {company.branches.length === 0 ? (
            <p className="text-fg-subtle">No offices listed.</p>
          ) : (
            <ul className="divide-y divide-border">
              {company.branches.map((b) => (
                <li key={b.id} className="py-2">
                  <span className="font-medium">{b.name}</span>
                  <span className="block text-sm text-fg-subtle">
                    {b.city}, {b.country}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <section aria-labelledby="open-jobs">
        <h2 id="open-jobs" className="mb-2 text-2xl font-medium">
          Open jobs
        </h2>
        <JobCardList
          jobs={openJobs}
          hrefBase={jobHrefBase}
          employerView={jobHrefBase.startsWith("/employer")}
          emptyMessage={`${company.name} has no open jobs right now.`}
        />
      </section>
    </div>
  );
}
