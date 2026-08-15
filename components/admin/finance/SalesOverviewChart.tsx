"use client";

import { useId, useState } from "react";
import { formatPrice } from "@/lib/utils";
import type { FinanceSalesPoint } from "@/lib/admin/finance-shared";

const CHART_HEIGHT = 200;
const BAR_MAX_WIDTH = 24;
// This admin panel's own established "primary metric" hue (KpiCard's value
// text, PaymentOverviewCards' net figure) -- single series, so one fixed
// hue is correct per the dataviz skill's color-by-job rule (identity needs
// a categorical palette; a single series just needs one consistent color).
// Never used for axis/tooltip TEXT -- those stay on text tokens throughout.
const BAR_COLOR = "#0F2D52";

function niceMax(max: number): number {
  if (max <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(max));
  const normalized = max / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

export function SalesOverviewChart({
  series,
  bucket,
}: {
  series: FinanceSalesPoint[];
  bucket: "day" | "week" | "month";
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [tableView, setTableView] = useState(false);
  const gradientId = useId();

  const hasData = series.length > 0 && series.some((p) => p.total > 0);
  const bucketNoun = bucket === "day" ? "Daily" : bucket === "week" ? "Weekly" : "Monthly";

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold tracking-wide text-[var(--color-text-secondary)] uppercase">
            Sales Overview
          </p>
          <p className="text-[11px] text-[var(--muted)]">{bucketNoun} totals</p>
        </div>
        {hasData && (
          <button
            type="button"
            onClick={() => setTableView((v) => !v)}
            className="text-xs font-medium text-[var(--muted)] underline"
          >
            {tableView ? "View as chart" : "View as table"}
          </button>
        )}
      </div>

      {!hasData ? (
        <p className="mt-8 mb-8 text-center text-sm text-[var(--muted)]">
          No sales data available for this period.
        </p>
      ) : tableView ? (
        <div className="mt-3 max-h-64 overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--color-text-secondary)]">
                <th className="py-1.5 font-medium">Period</th>
                <th className="py-1.5 text-right font-medium">Sales</th>
              </tr>
            </thead>
            <tbody>
              {series.map((p) => (
                <tr key={p.date} className="border-b border-[var(--border)] last:border-0">
                  <td className="py-1.5">{p.label}</td>
                  <td className="py-1.5 text-right [font-variant-numeric:tabular-nums]">{formatPrice(p.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <BarChart
          series={series}
          hoverIndex={hoverIndex}
          onHover={setHoverIndex}
          gradientId={gradientId}
        />
      )}
    </div>
  );
}

function BarChart({
  series,
  hoverIndex,
  onHover,
  gradientId,
}: {
  series: FinanceSalesPoint[];
  hoverIndex: number | null;
  onHover: (index: number | null) => void;
  gradientId: string;
}) {
  const max = niceMax(Math.max(...series.map((p) => p.total)));
  const bandWidth = 100 / series.length;
  const barWidthPercent = Math.min(bandWidth * 0.7, (BAR_MAX_WIDTH / (series.length * 4)) * 100);
  const gridSteps = [0, 0.25, 0.5, 0.75, 1];

  // Sparse x-axis labels -- never one per bar (they'd collide past ~10
  // bars); show at most ~6 evenly spaced labels, always including the ends.
  const labelEvery = Math.max(1, Math.ceil(series.length / 6));

  return (
    <div className="mt-3">
      <div className="relative" style={{ height: CHART_HEIGHT }}>
        <svg
          viewBox={`0 0 100 ${CHART_HEIGHT}`}
          preserveAspectRatio="none"
          className="h-full w-full overflow-visible"
          role="img"
          aria-label={`Sales by period, ${series.length} periods, peak ${formatPrice(max)}`}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={BAR_COLOR} />
              <stop offset="100%" stopColor={BAR_COLOR} stopOpacity="0.75" />
            </linearGradient>
          </defs>

          {/* Gridlines: hairline, recessive, one-step-off-surface gray */}
          {gridSteps.map((step) => (
            <line
              key={step}
              x1="0"
              x2="100"
              y1={CHART_HEIGHT * (1 - step)}
              y2={CHART_HEIGHT * (1 - step)}
              stroke="var(--border)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {series.map((point, i) => {
            const barHeight = max > 0 ? (point.total / max) * (CHART_HEIGHT - 4) : 0;
            const x = i * bandWidth + (bandWidth - barWidthPercent) / 2;
            const y = CHART_HEIGHT - barHeight;
            const isHovered = hoverIndex === i;
            return (
              <g key={point.date}>
                {/* Full-band transparent hit target -- bigger than the
                    painted bar, per the skill's hit-target rule. */}
                <rect
                  x={i * bandWidth}
                  y={0}
                  width={bandWidth}
                  height={CHART_HEIGHT}
                  fill="transparent"
                  onPointerEnter={() => onHover(i)}
                  onPointerLeave={() => onHover(null)}
                  onFocus={() => onHover(i)}
                  onBlur={() => onHover(null)}
                  tabIndex={0}
                  role="button"
                  aria-label={`${point.label}: ${formatPrice(point.total)}`}
                />
                {barHeight > 0 && (
                  <rect
                    x={x}
                    y={y}
                    width={barWidthPercent}
                    height={barHeight}
                    rx="1.2"
                    fill={`url(#${gradientId})`}
                    opacity={isHovered ? 1 : 0.9}
                    className="transition-opacity"
                    pointerEvents="none"
                  />
                )}
              </g>
            );
          })}
        </svg>

        {hoverIndex != null && (
          <div
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-white px-2.5 py-1.5 text-xs shadow-[var(--shadow-card-hover)]"
            style={{ left: `${(hoverIndex + 0.5) * bandWidth}%` }}
          >
            <p className="font-semibold text-[var(--foreground)]">{formatPrice(series[hoverIndex].total)}</p>
            <p className="text-[var(--muted)]">{series[hoverIndex].label}</p>
          </div>
        )}
      </div>

      <div className="mt-1 flex text-[10px] text-[var(--muted)]">
        {series.map((point, i) => (
          <span key={point.date} style={{ width: `${bandWidth}%` }} className="shrink-0 truncate text-center">
            {i % labelEvery === 0 || i === series.length - 1 ? point.label : ""}
          </span>
        ))}
      </div>
    </div>
  );
}
