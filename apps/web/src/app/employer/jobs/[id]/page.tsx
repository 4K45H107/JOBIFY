import type { Metadata } from "next";
import Link from "next/link";
import { EmployerJobActions } from "@/components/jobs/EmployerJobActions";
import { JobDetailPanel } from "@/components/jobs/JobDetailPanel";
import { Card, CardHeader } from "@/components/ui/Card";
import { loadOwnJob } from "../load-job";

/**
 * Links into the coding test setup load the page normally instead of navigating in the app: in
 * production builds (Next 15.5) an in-app navigation to it sometimes never finished.
 */
function SkillTestLink({
  href,
  coding,
  className,
  children,
}: {
  href: string;
  coding: boolean;
  className: string;
  children: React.ReactNode;
}) {
  return coding ? (
    <a href={href} className={className}>
      {children}
    </a>
  ) : (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

const testLinkClass =
  "inline-flex h-10 items-center rounded-[10px] border border-outline px-5 font-medium tracking-label uppercase hover:bg-surface-grey";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  return { title: (await loadOwnJob((await params).id)).title };
}

export default async function EmployerJobPage({ params }: { params: Promise<{ id: string }> }) {
  const job = await loadOwnJob((await params).id);
  return (
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <JobDetailPanel
        job={job}
        collapsible={false}
        actions={<EmployerJobActions job={job} />}
        companyHref="/employer/company"
        fullPageHref={null}
      />
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader title="Applicants" description={`${job.applicants} so far`} />
          <Link
            href={`/employer/jobs/${job.id}/applicants`}
            className="inline-flex h-10 items-center rounded-full bg-primary px-6 font-medium tracking-label text-primary-fg uppercase"
          >
            Review applicants
          </Link>
        </Card>
        <Card>
          <CardHeader
            title="Skill test"
            description={
              job.assessmentKind === "CODING"
                ? "New applicants solve a coding problem."
                : job.assessmentKind === "MCQ"
                  ? "New applicants take a multiple-choice test."
                  : "Add a test new applicants take after applying: multiple choice, or a coding problem from the library."
            }
          />
          {job.assessmentKind ? (
            <div className="flex flex-col items-start gap-2">
              <SkillTestLink
                href={`/employer/jobs/${job.id}/assessment`}
                coding={job.assessmentKind === "CODING"}
                className={testLinkClass}
              >
                Manage test
              </SkillTestLink>
              {/* Switch kinds (allowed until someone has taken it; the page says if not). */}
              <SkillTestLink
                href={
                  job.assessmentKind === "CODING"
                    ? `/employer/jobs/${job.id}/assessment?kind=mcq`
                    : `/employer/jobs/${job.id}/assessment?kind=coding`
                }
                coding={job.assessmentKind !== "CODING"}
                className="text-sm text-link underline"
              >
                {job.assessmentKind === "CODING"
                  ? "Use multiple choice instead"
                  : "Use a coding problem instead"}
              </SkillTestLink>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Link href={`/employer/jobs/${job.id}/assessment?kind=mcq`} className={testLinkClass}>
                Multiple choice +
              </Link>
              <SkillTestLink
                href={`/employer/jobs/${job.id}/assessment?kind=coding`}
                coding
                className={testLinkClass}
              >
                Coding problem +
              </SkillTestLink>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
