import type { MarketingSourceRow } from "@/lib/admin/analytics-query";

// One row per distinct source (a real utm_source value, or "organic"/
// "direct" -- see proxy.ts's resolveSource) captured on each session's
// first page load, not per-event -- a session that browses 20 pages still
// only counts once here.
export function MarketingSourcesCard({ sources }: { sources: MarketingSourceRow[] }) {
  if (sources.length === 0) {
    return (
      <p className="rounded-[var(--radius-card)] border border-[var(--border)] bg-white p-4 text-sm text-[var(--color-text-secondary)]">
        No session data in this range yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-[var(--border)] bg-white p-4">
      {sources.map((row) => (
        <div key={row.source} className="flex items-center gap-3">
          <span className="w-28 shrink-0 truncate text-sm font-medium capitalize">{row.source}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/[0.04]">
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{ width: `${Math.max(row.percent, row.sessions > 0 ? 1.5 : 0)}%` }}
            />
          </div>
          <span className="w-20 shrink-0 text-right text-xs text-[var(--color-text-secondary)]">
            {row.sessions} ({row.percent.toFixed(0)}%)
          </span>
        </div>
      ))}
    </div>
  );
}
