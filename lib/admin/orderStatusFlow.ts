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

// Admin order-management workflow tabs — a view/grouping layer on top of
// order_status, not a new status. No dedicated statuses exist for
// "Packaging" or "Ready to Ship": 'packing' already sits between
// 'confirmed' and 'shipped' with no real sub-state today, so Packaging
// groups confirmed+packing (the whole pre-ship pipeline) and Ready to Ship
// is just packing filtered on its own. Likewise Out for Delivery groups
// shipped+out_for_delivery (the spec never mentions "shipped" as its own
// stage, but real orders do sit in that status) plus failed_delivery (an
// exception branch off out_for_delivery, surfaced here rather than
// orphaned with no tab at all).
export type AdminOrderTab =
  | "all"
  | "new"
  | "packaging"
  | "ready_to_ship"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "returned";

export const ADMIN_ORDER_TAB_STATUSES: Record<AdminOrderTab, OrderFulfillmentStatus[] | null> = {
  all: null,
  new: ["pending"],
  packaging: ["confirmed", "packing"],
  ready_to_ship: ["packing"],
  out_for_delivery: ["shipped", "out_for_delivery", "failed_delivery"],
  delivered: ["delivered"],
  cancelled: ["cancelled"],
  returned: ["returned"],
};

export const ADMIN_ORDER_TAB_LABELS: Record<AdminOrderTab, string> = {
  all: "All",
  new: "New Orders",
  packaging: "Packaging",
  ready_to_ship: "Ready to Ship",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
};

// Tabs shown in the summary-card row — a subset of ADMIN_ORDER_TAB_LABELS
// (no "All"/"Returned" card, per spec: 6 cards only, Returned is
// tab-only/low-priority).
export const ADMIN_ORDER_SUMMARY_CARD_TABS: AdminOrderTab[] = [
  "new",
  "packaging",
  "ready_to_ship",
  "out_for_delivery",
  "delivered",
  "cancelled",
];

// Tabs shown in the tab strip, in order — includes "All" and "Returned".
export const ADMIN_ORDER_TAB_ORDER: AdminOrderTab[] = [
  "all",
  "new",
  "packaging",
  "ready_to_ship",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "returned",
];
