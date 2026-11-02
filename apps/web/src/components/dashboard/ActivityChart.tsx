"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { DashboardSeries } from "@jobify/shared";
import { dayLabel, fullDayLabel, smoothPath, yTicks } from "@/lib/chart";

const HEIGHT = 240;
const PAD = { top: 28, right: 16, bottom: 28, left: 32 };

/** Width of an element, kept up to date as it resizes. */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry!.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

/**
 * Figma "Your statistics": one series as a smooth line with point markers. Hover, tap or
 * arrow keys show a day's value; the busiest day is labelled; a table view is always
 * there for screen readers.
 */
export function ActivityChart({ series }: { series: DashboardSeries }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const titleId = useId();
  const { points, label } = series;

  const ticks = yTicks(Math.max(0, ...points.map((p) => p.value)));
  const top = ticks.at(-1)!;
  const innerW = Math.max(0, width - PAD.left - PAD.right);
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (points.length > 1 ? (i / (points.length - 1)) * innerW : 0);
  const y = (v: number) => PAD.top + innerH - (v / top) * innerH;
  const xy = points.map((p, i) => ({ x: x(i), y: y(p.value) }));

  const week = points.length <= 7;
  // Every day for a week; about six labels for a month.
  const labelEvery = week ? 1 : Math.ceil(points.length / 6);
  const peak = points.reduce((best, p, i) => (p.value > points[best]!.value ? i : best), 0);

  const pick = (clientX: number, rect: DOMRect) => {
    const rel = clientX - rect.left - PAD.left;
    const i = Math.round((rel / (innerW || 1)) * (points.length - 1));
    setActive(Math.min(points.length - 1, Math.max(0, i)));
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const step = e.key === "ArrowLeft" ? -1 : 1;
    setActive((i) => Math.min(points.length - 1, Math.max(0, (i ?? points.length - 1) + step)));
  };

  const shown = active ?? null;
  const tip = shown !== null ? { ...xy[shown]!, point: points[shown]! } : null;

  return (
    <div ref={ref} className="relative w-full">
      <span id={titleId} className="sr-only">
        {label} per day. Use the left and right arrow keys to read each day.
      </span>
      {width > 0 && (
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-labelledby={titleId}
          tabIndex={0}
          className="block touch-pan-y rounded-[8px] focus-visible:outline-2 focus-visible:outline-link"
          onPointerMove={(e) => pick(e.clientX, e.currentTarget.getBoundingClientRect())}
          onPointerDown={(e) => pick(e.clientX, e.currentTarget.getBoundingClientRect())}
          onPointerLeave={() => setActive(null)}
          onKeyDown={onKeyDown}
          onBlur={() => setActive(null)}
        >
          {/* Recessive grid and axis labels. */}
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={PAD.left}
                x2={width - PAD.right}
                y1={y(t)}
                y2={y(t)}
                className="stroke-border"
                strokeWidth={1}
              />
              <text
                x={PAD.left - 10}
                y={y(t)}
                dy="0.32em"
                textAnchor="end"
                className="fill-fg-subtle text-[11px]"
              >
                {t}
              </text>
            </g>
          ))}
          {points.map((p, i) =>
            i % labelEvery === 0 || i === points.length - 1 ? (
              <text
                key={p.date}
                x={x(i)}
                y={HEIGHT - 6}
                textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}
                className="fill-fg-subtle text-[11px]"
              >
                {dayLabel(p.date, week)}
              </text>
            ) : null,
          )}

          {tip && (
            <line
              x1={tip.x}
              x2={tip.x}
              y1={PAD.top}
              y2={PAD.top + innerH}
              className="stroke-fg-subtle"
              strokeDasharray="3 3"
            />
          )}
          <path
            d={smoothPath(xy)}
            fill="none"
            className="stroke-fg"
            strokeWidth={2}
            strokeLinecap="round"
          />
          {/* Markers for a week; a month is too dense, so only the hovered day gets one. */}
          {xy.map((p, i) =>
            week || i === shown ? (
              <circle
                key={points[i]!.date}
                cx={p.x}
                cy={p.y}
                r={i === shown ? 5 : 4}
                className="fill-fg stroke-bg"
                strokeWidth={2}
              />
            ) : null,
          )}
          {/* The busiest day gets a direct label, unless the tooltip is showing. */}
          {shown === null && points[peak]!.value > 0 && (
            <text
              x={xy[peak]!.x}
              y={xy[peak]!.y - 12}
              textAnchor={peak === 0 ? "start" : peak === points.length - 1 ? "end" : "middle"}
              className="fill-fg text-xs font-semibold"
            >
              {points[peak]!.value}
            </text>
          )}
        </svg>
      )}
      {!width && <div style={{ height: HEIGHT }} />}

      {tip && (
        <div
          aria-hidden
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-[6px] border border-border bg-bg px-2.5 py-1.5 text-xs whitespace-nowrap shadow-md"
          style={{
            left: Math.min(Math.max(tip.x, 60), width - 60),
            top: tip.y - 10,
          }}
        >
          <p className="text-fg-subtle">{fullDayLabel(tip.point.date)}</p>
          <p className="font-semibold text-fg">
            {label}: {tip.point.value}
          </p>
        </div>
      )}
      {/* Live region so keyboard users hear the day they moved to. */}
      <p className="sr-only" aria-live="polite">
        {tip ? `${fullDayLabel(tip.point.date)}, ${label}: ${tip.point.value}` : ""}
      </p>

      <table className="sr-only">
        <caption>{label} per day</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">{label}</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.date}>
              <td>{fullDayLabel(p.date)}</td>
              <td>{p.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
