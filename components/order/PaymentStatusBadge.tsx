import type { PaymentStatus } from "@/types";

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "Payment pending",
  awaiting_verification: "Awaiting verification",
  paid: "Paid",
  failed: "Payment failed",
  cancelled: "Payment cancelled",
  refunded: "Refunded",
};

// Color-codes each status (previously every status rendered in the same
// plain border-only style with no color at all).
const STATUS_COLOR_CLASS: Record<PaymentStatus, string> = {
  pending: "border-[var(--color-warning)] text-[var(--color-warning)]",
  awaiting_verification: "border-[var(--color-warning)] text-[var(--color-warning)]",
  paid: "border-[var(--color-success)] text-[var(--color-success)]",
  failed: "border-[var(--color-error)] text-[var(--color-error)]",
  cancelled: "border-[var(--color-discount)] text-[var(--color-discount)]",
  refunded: "border-[var(--muted)] text-[var(--muted)]",
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <span
      className={`border px-2 py-0.5 text-xs whitespace-nowrap uppercase tracking-wide ${STATUS_COLOR_CLASS[status]}`}
    >
      {PAYMENT_STATUS_LABELS[status]}
    </span>
  );
}
