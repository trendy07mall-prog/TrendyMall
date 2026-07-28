import type { PaymentStatus } from "@/types";

const LABELS: Record<PaymentStatus, string> = {
  pending: "Payment pending",
  awaiting_verification: "Awaiting verification",
  paid: "Paid",
  failed: "Payment failed",
  cancelled: "Payment cancelled",
  refunded: "Refunded",
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <span className="border border-current px-2 py-0.5 text-xs whitespace-nowrap uppercase tracking-wide">
      {LABELS[status]}
    </span>
  );
}
