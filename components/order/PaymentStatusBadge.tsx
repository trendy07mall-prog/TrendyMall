import { StatusBadge, type StatusTone } from "@/components/ui/StatusBadge";
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
const STATUS_TONES: Record<PaymentStatus, StatusTone> = {
  pending: "warning",
  awaiting_verification: "warning",
  paid: "success",
  failed: "danger",
  cancelled: "danger",
  refunded: "neutral",
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <StatusBadge
      tone={STATUS_TONES[status]}
      className={status === "failed" ? "!bg-[var(--color-error)]/15 !text-[var(--color-error)]" : ""}
    >
      {PAYMENT_STATUS_LABELS[status]}
    </StatusBadge>
  );
}
