import { formatPrice } from "@/lib/utils";
import type { CampaignPerformanceRow } from "@/lib/admin/campaign-analytics";

export function CampaignPerformanceTable({ rows }: { rows: CampaignPerformanceRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-white px-6 py-16 text-center text-sm text-[var(--muted)]">
        No campaign-priced orders in this period.
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold tracking-wide text-[var(--color-text-secondary)] uppercase">
          Campaign Performance
        </p>
        <p className="text-[11px] text-[var(--muted)]">
          &quot;Sales&quot; and &quot;Discount Given&quot; are estimated — see note below
        </p>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--color-text-secondary)]">
              <th className="py-2 pr-4 font-medium">Campaign</th>
              <th className="py-2 pr-4 text-right font-medium">Orders</th>
              <th className="py-2 pr-4 text-right font-medium">Sales (est.)</th>
              <th className="py-2 pr-4 text-right font-medium">Discount Given (est.)</th>
              <th className="py-2 text-right font-medium">Net Sales</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.campaignId} className="border-b border-[var(--border)] last:border-0">
                <td className="py-2.5 pr-4 font-medium">{row.campaignName}</td>
                <td className="py-2.5 pr-4 text-right [font-variant-numeric:tabular-nums]">{row.orderCount}</td>
                <td className="py-2.5 pr-4 text-right text-[var(--muted)] [font-variant-numeric:tabular-nums]">
                  {formatPrice(row.estimatedGrossSales)}
                </td>
                <td className="py-2.5 pr-4 text-right text-[var(--color-discount)] [font-variant-numeric:tabular-nums]">
                  -{formatPrice(row.estimatedDiscountGiven)}
                </td>
                <td className="py-2.5 text-right font-semibold [font-variant-numeric:tabular-nums]">
                  {formatPrice(row.netSales)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-[var(--muted)]">
        Net Sales is exact — the real amount charged for these orders. Sales and Discount Given are
        estimated from each product&apos;s price at the moment it was added to the campaign, which may
        differ slightly from its price at the exact time of each purchase.
      </p>
    </div>
  );
}
