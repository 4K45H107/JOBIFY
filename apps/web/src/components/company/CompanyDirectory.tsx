import Image from "next/image";
import type { CompanyList } from "@jobify/shared";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { serverApi } from "@/lib/api/server";
import { CompanyRow } from "./CompanyRow";

/** Figma "Explore - Companies": illustration, employer search and company rows. Shared by both areas. */
export async function CompanyDirectory({
  q,
  page,
  basePath,
  profileBase,
}: {
  q: string;
  page: string;
  /** This page's path, for the search form and pagination. */
  basePath: string;
  /** Where a company row links, e.g. "/companies". */
  profileBase: string;
}) {
  const list = await serverApi<CompanyList>(
    `/companies?${new URLSearchParams({ q, page, pageSize: "10" })}`,
  );

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <section className="grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Image
          src="/illustrations/companies.png"
          alt=""
          width={760}
          height={676}
          priority
          className="mx-auto w-full max-w-sm rounded-[10px] bg-[#f3f8f4]"
        />
        <div>
          <h1 className="text-2xl font-bold">Find a workplace that works for you!</h1>
          <p className="mt-3 text-lg text-fg-muted">
            Discover what an employer is really like before you make your next move. See their open
            roles, offices and team, and find companies that fit what matters to you.
          </p>
        </div>
      </section>

      {/* Figma: "Have an employer in mind? [Search for a company] [Search]" */}
      <form action={basePath} className="flex flex-wrap items-center justify-center gap-3">
        <label htmlFor="company-q" className="text-fg-muted">
          Have an employer in mind?
        </label>
        <input
          id="company-q"
          name="q"
          defaultValue={q}
          placeholder="SEARCH FOR A COMPANY"
          className="h-10 w-72 rounded-[10px] border border-outline px-4 text-sm tracking-label placeholder:uppercase"
        />
        <Button type="submit" size="sm">
          Search
        </Button>
      </form>

      <section aria-label="Companies">
        {list.items.length === 0 ? (
          <p className="rounded-[10px] bg-surface-grey p-8 text-center text-fg-subtle">
            No companies match “{q}”.
          </p>
        ) : (
          list.items.map((c) => (
            <CompanyRow key={c.id} company={c} href={`${profileBase}/${c.slug}`} />
          ))
        )}
        <Pagination
          page={list.page}
          pageSize={list.pageSize}
          total={list.total}
          basePath={basePath}
          params={{ q }}
        />
      </section>
    </div>
  );
}
