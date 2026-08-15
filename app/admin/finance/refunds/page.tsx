import { ReturnIcon } from "@/components/ui/Icon";

// A permanent state, not a "coming soon" -- this codebase's data model has
// no refund-amount field anywhere (confirmed in the Finance Phase 0 audit:
// payment_status='refunded' is the only signal, whole-order only, no
// partial/itemized refund column exists on orders or payments). Rather than
// fabricate a number or a fake empty table, this says so plainly. Revisit
// only if a real refund-amount field is added to the schema.
export default function AdminFinanceRefundsPage() {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--color-card)] px-6 py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black/5">
        <ReturnIcon className="h-6 w-6 text-[var(--color-text-secondary)]" />
      </div>
      <h1 className="font-heading mt-4 text-xl font-bold tracking-tight">Refunds</h1>
      <p className="mt-1.5 max-w-md text-sm text-[var(--muted)]">
        Refund tracking isn&apos;t configured. This store&apos;s data model doesn&apos;t store a refund
        amount anywhere — only whether an order&apos;s payment status was marked{" "}
        <span className="font-medium text-[var(--foreground)]">Refunded</span>, with no partial or
        itemized amount. Showing a number here would be a guess, not a fact, so this section stays
        empty until that data exists.
      </p>
      <span className="mt-4 rounded-full bg-black/5 px-3 py-1 text-xs font-semibold text-[var(--color-text-secondary)]">
        Not configured
      </span>
    </div>
  );
}
