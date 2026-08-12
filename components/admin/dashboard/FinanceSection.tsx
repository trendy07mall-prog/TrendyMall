import { formatPrice } from "@/lib/utils";

// No "Profit" anywhere -- there is no cost/expense data in this schema,
// so this only ever shows revenue-side figures, never a fabricated margin.
export function FinanceSection({
  revenue,
  paidTotal,
  pendingTotal,
  refundsTotal,
  gross,
  discounts,
  delivery,
  net,
}: {
  revenue: number;
  paidTotal: number;
  pendingTotal: number;
  refundsTotal: number;
  gross: number;
  discounts: number;
  delivery: number;
  net: number;
}) {
  const primary = [
    { label: "Revenue", value: revenue, accent: "text-[#0F2D52]" },
    { label: "Paid", value: paidTotal, accent: "text-emerald-600" },
    { label: "Pending", value: pendingTotal, accent: "text-[var(--color-warning)]" },
    { label: "Refunds", value: refundsTotal, accent: "text-[var(--color-discount)]" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {primary.map((item) => (
          <div
            key={item.label}
            className="rounded-[var(--radius-card)] border border-[var(--border)] bg-white p-4"
          >
            <p className={`text-xl font-semibold ${item.accent}`}>{formatPrice(item.value)}</p>
            <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-white p-4">
        <p className="text-xs font-semibold tracking-wide text-[var(--color-text-secondary)] uppercase">
          Breakdown
        </p>
        <dl className="mt-3 flex flex-col gap-2 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-[var(--color-text-secondary)]">Gross (subtotal)</dt>
            <dd className="font-medium">{formatPrice(gross)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-[var(--color-text-secondary)]">Discounts</dt>
            <dd className="font-medium text-[var(--color-discount)]">-{formatPrice(discounts)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-[var(--color-text-secondary)]">Delivery</dt>
            <dd className="font-medium">+{formatPrice(delivery)}</dd>
          </div>
          <div className="flex items-center justify-between border-t border-[var(--border)] pt-2">
            <dt className="font-semibold">Net</dt>
            <dd className="font-semibold text-[#0F2D52]">{formatPrice(net)}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
