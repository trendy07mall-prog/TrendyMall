import { formatPrice } from "@/lib/utils";
import type { FinanceRevenueBreakdown } from "@/lib/admin/finance-shared";

export function RevenueBreakdownCard({ breakdown }: { breakdown: FinanceRevenueBreakdown }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-white p-4">
      <p className="text-xs font-semibold tracking-wide text-[var(--color-text-secondary)] uppercase">
        Revenue Breakdown
      </p>
      <dl className="mt-3 flex flex-col gap-2 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-[var(--color-text-secondary)]">Product Sales</dt>
          <dd className="font-medium">{formatPrice(breakdown.productSales)}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-[var(--color-text-secondary)]">Delivery Charges</dt>
          <dd className="font-medium">+{formatPrice(breakdown.deliveryCharges)}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-[var(--color-text-secondary)]">Discounts</dt>
          <dd className="font-medium text-[var(--color-discount)]">-{formatPrice(breakdown.discounts)}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-[var(--color-text-secondary)]">
            Refunds
            <span className="ml-1 text-[10px] font-normal text-[var(--muted)]">(info only, not deducted below)</span>
          </dt>
          <dd className="font-medium text-[var(--muted)]">{formatPrice(breakdown.refunds)}</dd>
        </div>
        <div className="flex items-center justify-between border-t border-[var(--border)] pt-2">
          <dt className="font-semibold">Net Revenue</dt>
          <dd className="font-semibold text-[#0F2D52]">{formatPrice(breakdown.netRevenue)}</dd>
        </div>
      </dl>
    </div>
  );
}
