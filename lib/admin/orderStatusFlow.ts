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
// order_status, not a new status.
//
// These sets MUST NOT OVERLAP. Packaging used to be ["confirmed",
// "packing"] while Ready to Ship was ["packing"], so 'packing' belonged to
// both: marking an order packed moved it confirmed -> packing, which put
// it in Ready to Ship WITHOUT taking it out of Packaging. It looked like a
// stale cache (a hard refresh didn't clear it) but the list was correct --
// the order genuinely matched both tabs. Packaging is now 'confirmed'
// alone, so each order sits in exactly one pipeline tab and "Mark Packed"
// actually moves it.
//
// Out for Delivery still groups three statuses, and that is deliberate
// rather than the same bug: 'shipped', 'out_for_delivery' and
// 'failed_delivery' are stages of one physical step and appear in no other
// tab, so nothing can be in two places at once.
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
  packaging: ["confirmed"],
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
