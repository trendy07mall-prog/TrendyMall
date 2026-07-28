// Plain helpers shared between the admin Server Actions (lib/admin/
// orderActions.ts) and client components (OrderActionPanel.tsx) — kept
// out of orderActions.ts because a "use server" file may only export
// async functions, not constants/plain functions.

import type { OrderFulfillmentStatus } from "@/types";

export const ORDER_STATUS_PROGRESSION: OrderFulfillmentStatus[] = [
  "confirmed", "packing", "shipped", "out_for_delivery", "delivered",
];

export const ORDER_STATUS_LABELS: Record<OrderFulfillmentStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  packing: "Packing",
  shipped: "Shipped",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
};

export function getNextOrderStatus(
  current: OrderFulfillmentStatus,
): OrderFulfillmentStatus | null {
  const idx = ORDER_STATUS_PROGRESSION.indexOf(current);
  if (idx === -1 || idx === ORDER_STATUS_PROGRESSION.length - 1) return null;
  return ORDER_STATUS_PROGRESSION[idx + 1];
}
