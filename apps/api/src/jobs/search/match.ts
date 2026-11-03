import { Prisma } from "@jobify/db";
import { type SearchTerm, typoAllowance } from "./query";

/** Enough for any page of results; ranking happens in the database. */
const MAX_MATCHES = 1000;

const isWord = (s: string) => /^[a-z0-9]+$/.test(s);

/**
 * One alternative as a Postgres text query. English word forms always match ("developers" finds
 * "developer"); single words of 3+ letters also match as a prefix ("eng" finds "engineer").
 */
function alternativeQuery(alt: string, prefix: boolean): Prisma.Sql {
  if (alt.includes(" ") || !isWord(alt)) return Prisma.sql`phraseto_tsquery('english', ${alt})`;
  if (prefix && alt.length >= 3) return Prisma.sql`to_tsquery('english', ${`${alt}:*`})`;
  return Prisma.sql`plainto_tsquery('english', ${alt})`;
}

/** Any of a term's alternatives, as one text query. */
const termQuery = (term: SearchTerm, prefix: boolean) =>
  Prisma.sql`(${Prisma.join(
    term.alternatives.map((a) => alternativeQuery(a, prefix)),
    " || ",
  )})`;

/** A typo-tolerant match against the words of the title, skills and company name. */
function typoMatch(term: SearchTerm): Prisma.Sql | null {
  const words = term.alternatives.filter((a) => isWord(a) && typoAllowance(a) > 0);
  if (!words.length) return null;
  return Prisma.sql`EXISTS (
    SELECT 1 FROM regexp_split_to_table(d.words, '[^a-z0-9]+') AS w
    WHERE length(w) >= 3 AND (${Prisma.join(
      words.map((a) => Prisma.sql`levenshtein(w, ${a}) <= ${typoAllowance(a)}`),
      " OR ",
    )})
  )`;
}

/**
 * Open jobs matching every term, with a relevance score. The text searched is the title and skills
 * (weighted highest), company, location, workplace and job type, then the description. Exact words rank above prefixes
 * and near-spellings, and the whole query appearing in the title ranks higher still.
 */
export interface JobMatches {
  /** Job id -> relevance score. */
  scores: Map<string, number>;
  /** No job matched every term, so these match some of them (most terms first). */
  partial: boolean;
}

export async function matchJobs(
  prisma: { $queryRaw<T>(query: Prisma.Sql): Promise<T> },
  terms: SearchTerm[],
  today: Date,
): Promise<JobMatches> {
  if (!terms.length) return { scores: new Map(), partial: false };
  const all = await queryJobs(prisma, terms, today, "all");
  if (all.size || terms.length === 1) return { scores: all, partial: false };
  const some = await queryJobs(prisma, terms, today, "some");
  return { scores: some, partial: some.size > 0 };
}

async function queryJobs(
  prisma: { $queryRaw<T>(query: Prisma.Sql): Promise<T> },
  terms: SearchTerm[],
  today: Date,
  need: "all" | "some",
): Promise<Map<string, number>> {
  const whole = terms.map((t) => t.text).join(" ");
  const exactAll = Prisma.join(
    terms.map((t) => termQuery(t, false)),
    " || ",
  );
  const anyAll = Prisma.join(
    terms.map((t) => termQuery(t, true)),
    " || ",
  );
  const termMatches = terms.map((t) => {
    const typo = typoMatch(t);
    return typo
      ? Prisma.sql`(d.tsv @@ ${termQuery(t, true)} OR ${typo})`
      : Prisma.sql`(d.tsv @@ ${termQuery(t, true)})`;
  });
  const condition = Prisma.join(termMatches, need === "all" ? " AND " : " OR ");
  // With partial matches, each matched term outweighs any amount of text ranking.
  const termsMatched = Prisma.join(
    termMatches.map((m) => Prisma.sql`(CASE WHEN ${m} THEN 10 ELSE 0 END)`),
    " + ",
  );

  const rows = await prisma.$queryRaw<{ id: string; score: number }[]>(Prisma.sql`
    WITH d AS (
      SELECT j.id, lower(j.title) AS title,
        setweight(to_tsvector('english', j.title), 'A') ||
        setweight(to_tsvector('english', coalesce(s.skills, '')), 'A') ||
        setweight(to_tsvector('english', c.name), 'B') ||
        setweight(to_tsvector('english', coalesce(j.city, '') || ' ' || j.country || ' '
          || replace(lower(j.workplace::text), '_', ' ') || ' '
          || replace(lower(j.type::text), '_', ' ')), 'B') ||
        setweight(to_tsvector('english', j.description), 'D') AS tsv,
        lower(j.title || ' ' || coalesce(s.skills, '') || ' ' || c.name) AS words
      FROM "Job" j
      JOIN "Company" c ON c.id = j."companyId"
      LEFT JOIN LATERAL (
        SELECT string_agg(sk.name, ' ') AS skills
        FROM "JobSkill" js JOIN "Skill" sk ON sk.id = js."skillId"
        WHERE js."jobId" = j.id
      ) s ON true
      WHERE j.status = 'OPEN' AND (j.deadline IS NULL OR j.deadline >= ${today})
    )
    SELECT d.id,
      (${termsMatched} + 2 * ts_rank_cd(d.tsv, ${exactAll}) + ts_rank_cd(d.tsv, ${anyAll})
        + CASE WHEN strpos(d.title, ${whole}) > 0 THEN 1 ELSE 0 END
        + similarity(d.title, ${whole}))::float8 AS score
    FROM d
    WHERE ${condition}
    ORDER BY score DESC
    LIMIT ${MAX_MATCHES}
  `);
  return new Map(rows.map((r) => [r.id, r.score]));
}
