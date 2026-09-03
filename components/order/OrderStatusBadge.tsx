import { StatusBadge, type StatusTone } from "@/components/ui/StatusBadge";
import { ORDER_STATUS_LABELS } from "@/lib/admin/orderStatusFlow";
import type { OrderFulfillmentStatus } from "@/types";

// Color-codes each status so a row's stage reads at a glance in the admin
// order list (previously every status rendered in the same plain
// border-only style with no color at all).
const STATUS_TONES: Record<OrderFulfillmentStatus, StatusTone> = {
  pending: "warning",
  confirmed: "neutral",
  packing: "neutral",
  shipped: "info",
  out_for_delivery: "info",
  delivered: "success",
  cancelled: "danger",
  returned: "danger",
  failed_delivery: "danger",
};

export function OrderStatusBadge({ status }: { status: OrderFulfillmentStatus }) {
  return (
    <StatusBadge
      tone={STATUS_TONES[status]}
      // failed_delivery needs higher contrast than a plain cancelled/
      // returned tint -- --color-error is deliberately darker/higher-
      // contrast than --color-discount for exactly this "needs to read as
      // an alert, not just a tint" case (see globals.css). ! forces the
      // override regardless of Tailwind's compiled class order.
      className={status === "failed_delivery" ? "!bg-[var(--color-error)]/15 !text-[var(--color-error)]" : ""}
    >
      {ORDER_STATUS_LABELS[status]}
    </StatusBadge>
  );
}
