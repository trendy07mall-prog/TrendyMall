import { ORDER_STATUS_LABELS } from "@/lib/admin/orderStatusFlow";
import type { OrderFulfillmentStatus } from "@/types";

// Color-codes each status so a row's stage reads at a glance in the admin
// order list (previously every status rendered in the same plain
// border-only style with no color at all).
const STATUS_COLOR_CLASS: Record<OrderFulfillmentStatus, string> = {
  pending: "border-[var(--color-warning)] text-[var(--color-warning)]",
  confirmed: "border-[var(--muted)] text-[var(--muted)]",
  packing: "border-[var(--muted)] text-[var(--muted)]",
  shipped: "border-[var(--foreground)] text-[var(--foreground)]",
  out_for_delivery: "border-[var(--foreground)] text-[var(--foreground)]",
  delivered: "border-[var(--color-success)] text-[var(--color-success)]",
  cancelled: "border-[var(--color-discount)] text-[var(--color-discount)]",
  returned: "border-[var(--color-discount)] text-[var(--color-discount)]",
  failed_delivery: "border-[var(--color-error)] text-[var(--color-error)]",
};

export function OrderStatusBadge({ status }: { status: OrderFulfillmentStatus }) {
  return (
    <span
      className={`border px-2 py-0.5 text-xs whitespace-nowrap uppercase tracking-wide ${STATUS_COLOR_CLASS[status]}`}
    >
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}
