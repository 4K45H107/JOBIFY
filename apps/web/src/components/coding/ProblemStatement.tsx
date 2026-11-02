import {
  CODING_DIFFICULTY_LABELS,
  type CodingDifficulty,
  type CodingProblem,
} from "@jobify/shared";
import { cn } from "@/lib/cn";

/** Solid fills with page-colour text: at least 4.8:1 in both themes, on any card behind them. */
const DIFFICULTY_STYLES: Record<CodingDifficulty, string> = {
  EASY: "bg-success text-bg",
  MEDIUM: "bg-chip text-chip-fg",
  HARD: "bg-heading-accent text-bg",
};

export function DifficultyBadge({ difficulty }: { difficulty: CodingDifficulty }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-label uppercase",
        DIFFICULTY_STYLES[difficulty],
      )}
    >
      {CODING_DIFFICULTY_LABELS[difficulty]}
    </span>
  );
}

function Block({
  title,
  level,
  children,
}: {
  title: string;
  level: 2 | 3;
  children: React.ReactNode;
}) {
  const Heading = level === 2 ? "h2" : "h3";
  return (
    <section className="flex flex-col gap-1.5">
      <Heading className="font-semibold">{title}</Heading>
      {children}
    </section>
  );
}

/** Text that may hold several lines (sample input and output). */
function Pre({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-[8px] bg-surface-grey px-3 py-2 font-mono text-sm whitespace-pre">
      {children.replace(/\n$/, "")}
    </pre>
  );
}

/** A library problem as a candidate reads it: statement, formats, limits and the samples. */
export function ProblemStatement({
  problem,
  headingLevel = 2,
  showHiddenCount = false,
}: {
  problem: CodingProblem;
  headingLevel?: 1 | 2;
  /** Employers see how many tests are kept back for grading. */
  showHiddenCount?: boolean;
}) {
  const Title = headingLevel === 1 ? "h1" : "h2";
  // Sections sit one level under the title.
  const sub = headingLevel === 1 ? 2 : 3;
  return (
    <article className="flex flex-col gap-5 leading-relaxed">
      <header className="flex flex-col gap-2">
        <Title className="text-2xl font-medium">{problem.title}</Title>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <DifficultyBadge difficulty={problem.difficulty} />
          {problem.topics.map((t) => (
            <span key={t} className="rounded-full border border-border px-2.5 py-0.5 text-fg-muted">
              {t.replace(/-/g, " ")}
            </span>
          ))}
        </div>
      </header>
      <p className="whitespace-pre-line">{problem.statement}</p>
      <Block level={sub} title="Input">
        <p className="text-fg-muted">{problem.inputFormat}</p>
      </Block>
      <Block level={sub} title="Output">
        <p className="text-fg-muted">{problem.outputFormat}</p>
      </Block>
      <Block level={sub} title="Constraints">
        <ul className="list-disc pl-5 text-fg-muted">
          {problem.constraints.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </Block>
      {problem.samples.map((s, i) => (
        <Block key={i} level={sub} title={`Example ${i + 1}`}>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="min-w-0">
              <p className="mb-1 text-xs font-semibold tracking-label text-fg-subtle uppercase">
                Input
              </p>
              <Pre>{s.input}</Pre>
            </div>
            <div className="min-w-0">
              <p className="mb-1 text-xs font-semibold tracking-label text-fg-subtle uppercase">
                Output
              </p>
              <Pre>{s.output}</Pre>
            </div>
          </div>
          {s.explanation && <p className="text-sm text-fg-muted">{s.explanation}</p>}
        </Block>
      ))}
      {showHiddenCount && (
        <p className="text-sm text-fg-subtle">
          Plus {problem.hiddenTests} hidden tests, used for grading once code running is set up.
        </p>
      )}
    </article>
  );
}
