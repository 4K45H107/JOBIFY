import Link from "next/link";
import { COMPANY_SIZE_LABELS, type CompanySummary } from "@jobify/shared";
import { CompanyLogo } from "./CompanyLogo";

/** Figma "Explore - Companies" row: logo, name, stats, then location / size / industry and description. */
export function CompanyRow({ company, href }: { company: CompanySummary; href: string }) {
  return (
    <article className="relative border-b border-fg/60 py-6">
      <Link href={href} className="absolute inset-0" aria-label={company.name} />
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <CompanyLogo
            name={company.name}
            src={company.logoUrl}
            className="size-14 text-lg md:size-16"
          />
          <h3 className="text-lg tracking-label uppercase">{company.name}</h3>
        </div>
        <dl className="flex gap-8 text-center">
          <div>
            <dd className="text-lg font-medium">{company.openJobs}</dd>
            <dt className="text-xs text-success">Open jobs</dt>
          </div>
          <div>
            <dd className="text-lg font-medium">{company.employees}</dd>
            <dt className="text-xs text-success">On Jobify</dt>
          </div>
        </dl>
      </div>
      <dl className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <dt className="font-medium">Location</dt>
          <dd className="text-sm text-fg-muted">{company.headquarters ?? "—"}</dd>
        </div>
        <div>
          <dt className="font-medium">Company size</dt>
          <dd className="text-sm text-fg-muted">
            {company.size ? COMPANY_SIZE_LABELS[company.size] : "—"}
          </dd>
        </div>
        <div>
          <dt className="font-medium">Industry</dt>
          <dd className="text-sm text-fg-muted">{company.industry ?? "—"}</dd>
        </div>
      </dl>
      {company.description && (
        <div className="mt-4">
          <p className="font-medium">Description</p>
          <p className="line-clamp-3 text-sm text-fg-muted">{company.description}</p>
        </div>
      )}
    </article>
  );
}
