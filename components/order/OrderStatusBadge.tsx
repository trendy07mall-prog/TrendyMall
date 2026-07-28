import type { OrderFulfillmentStatus } from "@/types";

const LABELS: Record<OrderFulfillmentStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  packing: "Packing",
  shipped: "Shipped",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
};

export function OrderStatusBadge({ status }: { status: OrderFulfillmentStatus }) {
  return (
    <span className="border border-current px-2 py-0.5 text-xs whitespace-nowrap uppercase tracking-wide">
      {LABELS[status]}
    </span>
  );
}
