import { formatPrice } from "@/lib/utils";
import type { SalesSeriesPoint } from "@/lib/admin/dashboard-query";

// Hand-rolled CSS bar chart -- no charting library exists in this codebase
// and the brief explicitly asked not to add one. Flex + height-percentage
// bars rather than SVG viewBox math, so it stays responsive with no
// scaling edge cases at narrow widths.
export function SalesChart({ data }: { data: SalesSeriesPoint[] }) {
  const max = Math.max(...data.map((d) => d.total), 1);
  // Dense ranges (30/90 days) would clutter every bar with a date label --
  // show at most ~8 evenly-spaced labels regardless of point count.
  const labelEvery = Math.max(1, Math.ceil(data.length / 8));

  if (data.every((d) => d.total === 0)) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-[var(--color-text-secondary)]">
        No sales in this range yet.
      </div>
    );
  }

  return (
    <div>
      <div className="flex h-48 items-end gap-1 sm:gap-1.5">
        {data.map((point) => {
          const heightPercent = (point.total / max) * 100;
          return (
            <div key={point.date} className="group relative flex h-full flex-1 flex-col justify-end">
              <div className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 rounded-[var(--radius-sm)] bg-[#0F2D52] px-2 py-1 text-[11px] whitespace-nowrap text-white group-hover:block">
                {formatPrice(point.total)}
              </div>
              <div
                className="w-full rounded-t-[3px] bg-[#0F2D52] transition-brand group-hover:bg-[#173f70]"
                style={{ height: `${Math.max(heightPercent, point.total > 0 ? 2 : 0.5)}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-1 sm:gap-1.5">
        {data.map((point, i) => (
          <div key={point.date} className="flex-1 text-center text-[10px] text-[var(--color-text-secondary)]">
            {i % labelEvery === 0
              ? new Date(point.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
              : ""}
          </div>
        ))}
      </div>
    </div>
  );
}
