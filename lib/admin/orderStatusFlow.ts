// Plain helpers shared between the admin Server Actions (lib/admin/
// orderActions.ts) and client components (OrderActionPanel.tsx) — kept
// out of orderActions.ts because a "use server" file may only export
// async functions, not constants/plain functions.

import type { OrderFulfillmentStatus } from "@/types";

// "pending" is step 1 ("Order Placed") — it belongs in the linear
// progression now, not collapsed into "confirmed" by the customer-facing
// timeline (see OrderTimeline.tsx's history: that collapsing hack was
// the bug — the badge showed "Pending" while the stepper showed
// "Confirmed" reached, two views of the same status disagreeing).
// failed_delivery is deliberately excluded, same as cancelled/returned —
// an exception branch off "out_for_delivery," never a linear/appended
// step.
export const ORDER_STATUS_PROGRESSION: OrderFulfillmentStatus[] = [
  "pending", "confirmed", "packing", "shipped", "out_for_delivery", "delivered",
];

export const ORDER_STATUS_LABELS: Record<OrderFulfillmentStatus, string> = {
  pending: "Order Placed",
  confirmed: "Confirmed",
  packing: "Packing",
  shipped: "Shipped",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
  failed_delivery: "Delivery Failed",
};

export function getNextOrderStatus(
  current: OrderFulfillmentStatus,
): OrderFulfillmentStatus | null {
  const idx = ORDER_STATUS_PROGRESSION.indexOf(current);
  if (idx === -1 || idx === ORDER_STATUS_PROGRESSION.length - 1) return null;
  return ORDER_STATUS_PROGRESSION[idx + 1];
}
