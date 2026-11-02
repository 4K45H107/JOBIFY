"use client";

import { useEffect, useState } from "react";
import {
  type Dashboard,
  DASHBOARD_RANGE_LABELS,
  DashboardRange,
  type DashboardStat,
} from "@jobify/shared";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/messages";
import { cn } from "@/lib/cn";
import { ActivityChart } from "./ActivityChart";

/** Figma "Profile": dark stat pills with a white count, then "Your statistics". */
function StatPill({ stat }: { stat: DashboardStat }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[8px] bg-primary py-2.5 pr-2.5 pl-5 text-primary-fg">
      <dt className="tracking-label">{stat.label}</dt>
      <dd className="min-w-14 rounded-full bg-bg px-3 py-0.5 text-center text-lg font-medium text-fg tabular-nums">
        {stat.value}
      </dd>
    </div>
  );
}

/**
 * The profile dashboard: headline counts and a per-day chart. Loaded in the browser so days
 * follow the viewer's own time zone.
 */
export function DashboardSection({ emptyHint }: { emptyHint: React.ReactNode }) {
  const [range, setRange] = useState<DashboardRange>("week");
  const [data, setData] = useState<Dashboard | null>(null);
  const [seriesKey, setSeriesKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    api<Dashboard>(`/me/dashboard?range=${range}&tz=${encodeURIComponent(tz)}`)
      .then((next) => !cancelled && setData(next))
      .catch((e: unknown) => !cancelled && setError(errorMessage(e)));
    return () => {
      cancelled = true;
    };
  }, [range, attempt]);

  if (error && !data) {
    return (
      <div className="flex flex-col items-start gap-3">
        <Alert>{error}</Alert>
        <Button variant="outline" size="sm" onClick={() => setAttempt((n) => n + 1)}>
          Try again
        </Button>
      </div>
    );
  }
  if (!data) return <DashboardSkeleton />;

  const series = data.series.find((s) => s.key === seriesKey) ?? data.series[0]!;
  const quiet = series.points.every((p) => p.value === 0);
  const nothingYet = data.stats.every((s) => s.value === 0);

  return (
    <div className="flex flex-col gap-10">
      <section aria-labelledby="dashboard-overview" className="flex flex-col gap-4">
        <h2 id="dashboard-overview" className="text-2xl font-medium">
          Overview
        </h2>
        <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data.stats.map((stat) => (
            <StatPill key={stat.key} stat={stat} />
          ))}
        </dl>
        {nothingYet && <p className="text-fg-subtle">{emptyHint}</p>}
      </section>

      <section aria-labelledby="dashboard-stats" className="flex max-w-3xl flex-col gap-4">
        <h2 id="dashboard-stats" className="text-2xl font-semibold">
          Your statistics
        </h2>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div role="tablist" aria-label="Chart" className="flex gap-1">
            {data.series.map((s) => (
              <button
                key={s.key}
                type="button"
                role="tab"
                aria-selected={s.key === series.key}
                onClick={() => setSeriesKey(s.key)}
                className={cn(
                  "rounded-[6px] px-3 py-1 text-sm font-semibold transition",
                  s.key === series.key ? "text-fg" : "text-fg-subtle hover:text-fg",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <span className="sr-only">Time range</span>
            <select
              value={range}
              onChange={(e) => setRange(DashboardRange.parse(e.target.value))}
              className="h-9 rounded-[8px] bg-surface-grey px-3 font-semibold"
            >
              {DashboardRange.options.map((r) => (
                <option key={r} value={r}>
                  {DASHBOARD_RANGE_LABELS[r]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div role="tabpanel" aria-label={series.label}>
          <ActivityChart key={`${series.key}-${data.range}`} series={series} />
        </div>
        {quiet && (
          <p className="text-sm text-fg-subtle">
            No {series.label.toLowerCase()} in this period yet.
          </p>
        )}
        {error && <Alert>{error}</Alert>}
      </section>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading your dashboard" className="flex flex-col gap-10">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-[8px] bg-surface-grey" />
        ))}
      </div>
      <div className="h-64 max-w-3xl animate-pulse rounded-[8px] bg-surface-grey" />
    </div>
  );
}
