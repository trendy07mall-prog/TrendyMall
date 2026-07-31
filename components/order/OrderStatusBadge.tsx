import { ORDER_STATUS_LABELS } from "@/lib/admin/orderStatusFlow";
import type { OrderFulfillmentStatus } from "@/types";

export function OrderStatusBadge({ status }: { status: OrderFulfillmentStatus }) {
  return (
    <span className="border border-current px-2 py-0.5 text-xs whitespace-nowrap uppercase tracking-wide">
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}
