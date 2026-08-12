import Link from "next/link";
import { TrendUpIcon, TrendDownIcon } from "@/components/ui/Icon";

// Same clickable-count-card shell OrderSummaryCards.tsx/ProductSummaryCards.tsx
// already share on /admin/orders and /admin/products -- extended with an
// optional accent color (this redesign's distinct admin palette: navy
// default, emerald/blue/orange for specific KPI meanings) and an optional
// real trend percentage. Never fabricates a trend -- omitted entirely
// (not shown as 0%) when the caller has no comparison data.
export function KpiCard({
  icon: Icon,
  label,
  value,
  href,
  trendPercent,
  accent = "navy",
}: {
  icon: (props: { className?: string }) => React.ReactElement;
  label: string;
  value: string | number;
  href?: string;
  trendPercent?: number | null;
  accent?: "navy" | "emerald" | "blue" | "orange";
}) {
  const accentClass = {
    navy: "bg-[#0F2D52]/10 text-[#0F2D52]",
    emerald: "bg-emerald-50 text-emerald-600",
    blue: "bg-blue-50 text-blue-600",
    orange: "bg-[var(--color-warning)]/10 text-[var(--color-warning)]",
  }[accent];

  const body = (
    <div className="transition-brand flex h-full flex-col gap-3 rounded-[var(--radius-card)] border border-[var(--border)] bg-white p-4 hover:border-[var(--border-hover)] hover:shadow-[var(--shadow-card-hover)]">
      <span className={`flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] ${accentClass}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-2xl font-semibold text-[#0F2D52]">{value}</p>
        <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">{label}</p>
      </div>
      {trendPercent != null && (
        <span
          className={`flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
            trendPercent >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-[var(--color-discount)]/10 text-[var(--color-discount)]"
          }`}
        >
          {trendPercent >= 0 ? <TrendUpIcon className="h-3 w-3" /> : <TrendDownIcon className="h-3 w-3" />}
          {Math.abs(trendPercent).toFixed(1)}% vs previous period
        </span>
      )}
    </div>
  );

  return href ? <Link href={href}>{body}</Link> : body;
}
