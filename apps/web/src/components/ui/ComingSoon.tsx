/** Placeholder for screens whose roadmap task hasn't been built yet. */
export function ComingSoon({
  title,
  figmaFrame,
  phase,
}: {
  title: string;
  figmaFrame: string;
  phase: string;
}) {
  return (
    <section className="mx-auto flex max-w-xl flex-col items-center gap-3 py-24 text-center">
      <h1 className="text-3xl font-medium">{title}</h1>
      <p className="text-fg-subtle">
        This screen (Figma frame <span className="font-medium text-fg-muted">“{figmaFrame}”</span>)
        is coming in {phase}.
      </p>
    </section>
  );
}
