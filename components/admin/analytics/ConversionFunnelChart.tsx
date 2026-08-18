import type { ConversionFunnelStage } from "@/lib/admin/analytics-query";

// Hand-rolled horizontal bar funnel -- no charting library exists in this
// codebase (see components/admin/dashboard/SalesChart.tsx's identical
// note). Each stage's bar width is relative to the FIRST stage's count
// (the funnel's own natural ceiling), not the max of all stages (which
// would always just be the first stage anyway, since a funnel only ever
// narrows), so the whole shape visually reads as a funnel.
export function ConversionFunnelChart({ funnel }: { funnel: ConversionFunnelStage[] }) {
  const ceiling = Math.max(funnel[0]?.count ?? 0, 1);

  return (
    <div className="flex flex-col gap-4">
      {funnel.map((stage, i) => {
        const widthPercent = (stage.count / ceiling) * 100;
        return (
          <div key={stage.eventType}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-sm">
              <span className="font-medium">{stage.label}</span>
              <span className="text-[var(--color-text-secondary)]">
                {stage.count.toLocaleString()}
                {stage.conversionFromPrevious != null && (
                  <span className="ml-2 text-xs">
                    ({stage.conversionFromPrevious.toFixed(1)}% from {funnel[i - 1].label})
                  </span>
                )}
              </span>
            </div>
            <div className="mt-1.5 h-8 w-full overflow-hidden rounded-[var(--radius-sm)] bg-black/[0.04]">
              <div
                className="h-full rounded-[var(--radius-sm)] bg-[#0F2D52] transition-[width] duration-300 ease-in-out"
                style={{ width: `${Math.max(widthPercent, stage.count > 0 ? 1.5 : 0)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
