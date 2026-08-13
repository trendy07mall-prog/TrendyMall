// One connected strip (single rounded container, thin dividers between
// segments) replacing the previous 4 separate boxy stat cards -- same
// live data as before, display only. grid-cols-2 + divide-x/divide-y on
// mobile (2x2, dividers on all four sides of each cell) collapses to a
// single row with only vertical dividers at sm+ via divide-y-0.
export function ShopStatStrip({
  stats,
}: {
  stats: {
    icon: (props: { className?: string }) => React.ReactElement;
    value: string;
    label: string;
  }[];
}) {
  return (
    <div className="grid grid-cols-2 divide-x divide-y divide-[var(--border)] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--color-card)] sm:grid-cols-4 sm:divide-y-0">
      {stats.map((stat) => (
        <div key={stat.label} className="flex items-center gap-3 px-4 py-4 sm:px-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0F2D52]/10 text-[#0F2D52]">
            <stat.icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold leading-tight">{stat.value}</p>
            <p className="text-xs text-[var(--color-text-secondary)]">{stat.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
