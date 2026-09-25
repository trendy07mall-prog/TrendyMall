"use server";

import { revalidatePath, updateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { requireAdminClient } from "@/lib/admin/guard";
import { getAdminOrderIdsForFilters } from "@/lib/admin/orders-query";
import type { AdminOrderFilterState } from "@/lib/admin/order-filters";
import { sendOrderStatusEmail, sendPaymentReceivedNotification } from "@/lib/email";
import { getNotificationSettings } from "@/lib/data/settings";
import { getNextOrderStatus, ORDER_STATUS_LABELS } from "@/lib/admin/orderStatusFlow";
import { getWhatsAppUrl } from "@/lib/site";
import type { OrderFulfillmentStatus, PaymentStatus } from "@/types";
import { getGeneralSettings } from "@/lib/data/settings";

export type OrderActionResult = { success: true } | { error: string };

function revalidateOrderPaths(orderId: string) {
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin");
  revalidatePath("/account/orders");
  revalidatePath(`/account/orders/${orderId}`);
  // An order moving through fulfilment changes two things the storefront
  // caches: stock (carried on cached product rows) and per-campaign units
  // sold. Neither has an admin "edit" to invalidate it, so without this
  // they'd sit stale until their TTL expired.
  updateTag(CACHE_TAGS.products);
  updateTag(CACHE_TAGS.soldCounts);
}

export async function confirmOrder(orderId: string): Promise<OrderActionResult> {
  const supabase = await requireAdminClient();

  const { data: order, error } = await supabase
    .from("orders")
    .update({ order_status: "confirmed" })
    .eq("id", orderId)
    .eq("order_status", "pending")
    .select("order_number, customer_name, customer_email")
    .maybeSingle();

  if (error) return { error: error.message };
  if (!order) return { error: "This order is not pending confirmation." };

  await sendOrderStatusEmail({
    orderNumber: order.order_number,
    customerName: order.customer_name,
    customerEmail: order.customer_email,
    label: "Confirmed",
  });

  revalidateOrderPaths(orderId);
  return { success: true };
}

// COD is paid at delivery, not verified from a slip — a separate,
// explicit action from Phase 3's verifyBankTransferPayment (which stays
// the only path for bank_transfer orders).
export async function markOrderPaid(orderId: string): Promise<OrderActionResult> {
  const supabase = await requireAdminClient();

  const { data: current } = await supabase
    .from("orders")
    .select("payment_method, payment_status")
    .eq("id", orderId)
    .maybeSingle();

  if (!current) return { error: "Order not found." };
  if (current.payment_method !== "cod") {
    return { error: "Only Cash on Delivery orders can be marked paid this way." };
  }
  if (current.payment_status === "paid") {
    return { error: "This order is already marked paid." };
  }

  const { data: order, error } = await supabase
    .from("orders")
    .update({ payment_status: "paid" })
    .eq("id", orderId)
    .select("order_number, customer_name, customer_email, total")
    .maybeSingle();

  if (error) return { error: error.message };
  if (!order) return { error: "Order not found." };

  await sendOrderStatusEmail({
    orderNumber: order.order_number,
    customerName: order.customer_name,
    customerEmail: order.customer_email,
    label: "Payment Received",
  });

  const notifications = await getNotificationSettings();
  if (notifications.paymentReceivedEnabled) {
    await sendPaymentReceivedNotification({
      orderNumber: order.order_number,
      customerName: order.customer_name,
      paymentMethod: "Cash on Delivery",
      total: order.total,
    });
  }

  revalidateOrderPaths(orderId);
  return { success: true };
}

// Ready to Ship → Mark as Shipped: one atomic update instead of separately
// calling addOrderTracking then advanceOrderStatus, so a manipulated
// client can't ship (advance past packing) without ever supplying
// courier+tracking — the gate the packing→shipped step needs, per the
// spec's "don't let staff ship without a tracking number" requirement.
export async function markOrderShipped(
  orderId: string,
  input: { courier: string; trackingNumber: string; trackingUrl: string | null },
): Promise<OrderActionResult> {
  const supabase = await requireAdminClient();

  const courier = input.courier.trim();
  const trackingNumber = input.trackingNumber.trim();
  if (!courier || !trackingNumber) {
    return { error: "Courier and tracking number are required before shipping." };
  }

  const { data: order, error } = await supabase
    .from("orders")
    .update({
      courier,
      tracking_number: trackingNumber,
      tracking_url: input.trackingUrl?.trim() || null,
      order_status: "shipped",
    })
    .eq("id", orderId)
    .eq("order_status", "packing")
    .select("order_number, customer_name, customer_email")
    .maybeSingle();

  if (error) return { error: error.message };
  if (!order) return { error: "This order is not ready to ship." };

  await sendOrderStatusEmail({
    orderNumber: order.order_number,
    customerName: order.customer_name,
    customerEmail: order.customer_email,
    label: ORDER_STATUS_LABELS.shipped,
    detail: `Tracking added — ${courier}: ${trackingNumber}`,
  });

  revalidateOrderPaths(orderId);
  return { success: true };
}

// Ready to Ship → Out for Delivery, with NO tracking requirement.
//
// Deliberately distinct from markOrderShipped above, which gates on
// courier+tracking. Dispatching a batch to a rider is a different act from
// handing a parcel to a courier with a consignment number: the admin's
// bulk "Mark Out for Delivery" has to work on a whole tab at once, and
// requiring a typed tracking number per order would make that impossible.
// markOrderShipped is untouched, so the per-order "add tracking and ship"
// path keeps its gate exactly as before.
//
// Goes straight to 'out_for_delivery' rather than stepping through
// 'shipped'. That is what the Out for Delivery tab means operationally,
// and markOrderDelivered accepts ONLY 'out_for_delivery' -- routing
// through 'shipped' would leave orders in a state the next bulk step
// refuses. Tracking stays editable before or after, via addOrderTracking
// (the Ready to Ship row form and the order detail page both use it).
export async function markOrderOutForDelivery(orderId: string): Promise<OrderActionResult> {
  const supabase = await requireAdminClient();

  const { data: order, error } = await supabase
    .from("orders")
    .update({ order_status: "out_for_delivery" })
    .eq("id", orderId)
    // Guards the transition at the database, so a stale page cannot push
    // an order forward from some other status.
    .eq("order_status", "packing")
    .select("order_number, customer_name, customer_email")
    .maybeSingle();

  if (error) return { error: error.message };
  if (!order) return { error: "This order is not ready to ship." };

  await sendOrderStatusEmail({
    orderNumber: order.order_number,
    customerName: order.customer_name,
    customerEmail: order.customer_email,
    label: ORDER_STATUS_LABELS.out_for_delivery,
  });

  revalidateOrderPaths(orderId);
  return { success: true };
}

// Out for Delivery → Delivered, with the COD cash-reconciliation prompt:
// we've previously had orders showing Delivered + Payment Pending at the
// same time, which is contradictory for Cash on Delivery. codCollected is
// only meaningful (and required) when the order is COD and not yet paid;
// for every other case this behaves exactly like advanceOrderStatus.
export async function markOrderDelivered(
  orderId: string,
  input?: { codCollected?: boolean },
): Promise<OrderActionResult> {
  const supabase = await requireAdminClient();

  const { data: current } = await supabase
    .from("orders")
    .select("order_status, payment_method, payment_status")
    .eq("id", orderId)
    .maybeSingle();

  if (!current) return { error: "Order not found." };
  if (current.order_status !== "out_for_delivery") {
    return { error: "This order is not out for delivery." };
  }

  const isUnpaidCod = current.payment_method === "cod" && current.payment_status !== "paid";

  const updates: { order_status: OrderFulfillmentStatus; payment_status?: PaymentStatus } = {
    order_status: "delivered",
  };
  if (isUnpaidCod) {
    // 'failed' (not 'pending') marks this as an exception the staff have
    // already looked at and confirmed collection didn't happen — distinct
    // from a plain not-yet-attempted pending state. Surfaced via the
    // Delivered tab's Payment Status column rather than a new column.
    updates.payment_status = input?.codCollected ? "paid" : "failed";
  }

  const { data: order, error } = await supabase
    .from("orders")
    .update(updates)
    .eq("id", orderId)
    .eq("order_status", "out_for_delivery")
    .select("order_number, customer_name, customer_email")
    .maybeSingle();

  if (error) return { error: error.message };
  if (!order) return { error: "This order's status changed — please refresh." };

  await sendOrderStatusEmail({
    orderNumber: order.order_number,
    customerName: order.customer_name,
    customerEmail: order.customer_email,
    label: ORDER_STATUS_LABELS.delivered,
  });

  revalidateOrderPaths(orderId);
  return { success: true };
}

export async function addOrderTracking(
  orderId: string,
  input: { courier: string; trackingNumber: string; trackingUrl: string | null },
): Promise<OrderActionResult> {
  const supabase = await requireAdminClient();

  const courier = input.courier.trim();
  const trackingNumber = input.trackingNumber.trim();
  if (!courier || !trackingNumber) {
    return { error: "Courier and tracking number are required." };
  }

  const { data: order, error } = await supabase
    .from("orders")
    .update({
      courier,
      tracking_number: trackingNumber,
      tracking_url: input.trackingUrl?.trim() || null,
    })
    .eq("id", orderId)
    .select("order_number, customer_name, customer_email, order_status")
    .maybeSingle();

  if (error) return { error: error.message };
  if (!order) return { error: "Order not found." };

  await sendOrderStatusEmail({
    orderNumber: order.order_number,
    customerName: order.customer_name,
    customerEmail: order.customer_email,
    label: ORDER_STATUS_LABELS[order.order_status],
    detail: `Tracking added — ${courier}: ${trackingNumber}`,
  });

  revalidateOrderPaths(orderId);
  return { success: true };
}

// No client-supplied target status — the next step is always computed
// server-side from the order's current status, so a manipulated request
// can't skip a step in the packing→delivered progression.
//
// Marking a COD order delivered also marks it paid, in the same update
// — a delivered COD order with payment still "pending" is a contradiction
// (sql/041's one-time backfill fixes existing rows in this state; this
// is what stops new ones from happening). Automatic rather than a
// confirm-every-time prompt: the courier already collected the cash
// before this button gets clicked in the overwhelming common case, and
// "Flag Unpaid" (below) exists for the rare exception.
export async function advanceOrderStatus(orderId: string): Promise<OrderActionResult> {
  const supabase = await requireAdminClient();

  const { data: current } = await supabase
    .from("orders")
    .select("order_status, payment_method, payment_status")
    .eq("id", orderId)
    .maybeSingle();

  if (!current) return { error: "Order not found." };

  const next = getNextOrderStatus(current.order_status);
  if (!next) return { error: "This order has no further status to advance to." };

  const updates: { order_status: OrderFulfillmentStatus; payment_status?: PaymentStatus } = {
    order_status: next,
  };
  if (next === "delivered" && current.payment_method === "cod" && current.payment_status !== "paid") {
    updates.payment_status = "paid";
  }

  const { data: order, error } = await supabase
    .from("orders")
    .update(updates)
    .eq("id", orderId)
    .eq("order_status", current.order_status)
    .select("order_number, customer_name, customer_email")
    .maybeSingle();

  if (error) return { error: error.message };
  if (!order) return { error: "This order's status changed — please refresh." };

  await sendOrderStatusEmail({
    orderNumber: order.order_number,
    customerName: order.customer_name,
    customerEmail: order.customer_email,
    label: ORDER_STATUS_LABELS[next],
  });

  revalidateOrderPaths(orderId);
  return { success: true };
}

// Corrective path for the rare case a COD delivery's auto-assumed
// payment wasn't actually collected. Sets payment_status back to
// 'pending' (still owed), never touches order_status.
export async function flagOrderUnpaid(orderId: string): Promise<OrderActionResult> {
  const supabase = await requireAdminClient();

  const { data: current } = await supabase
    .from("orders")
    .select("payment_method, order_status, payment_status")
    .eq("id", orderId)
    .maybeSingle();

  if (!current) return { error: "Order not found." };
  if (current.payment_method !== "cod") {
    return { error: "Only Cash on Delivery orders can be flagged this way." };
  }
  if (current.order_status !== "delivered" || current.payment_status !== "paid") {
    return { error: "Only a delivered, paid COD order can be flagged unpaid." };
  }

  const { data: order, error } = await supabase
    .from("orders")
    .update({ payment_status: "pending" })
    .eq("id", orderId)
    .select("order_number, customer_name, customer_email")
    .maybeSingle();

  if (error) return { error: error.message };
  if (!order) return { error: "Order not found." };

  revalidateOrderPaths(orderId);
  return { success: true };
}

// A delivered order can only be refunded, never cancelled — cancel_order_atomic
// itself doesn't encode this business rule (it's a generic, reusable
// stock-restore primitive shared with refundOrder), so it's checked here.
export async function cancelOrder(orderId: string): Promise<OrderActionResult> {
  const supabase = await requireAdminClient();

  const { data: current } = await supabase
    .from("orders")
    .select("order_status")
    .eq("id", orderId)
    .maybeSingle();

  if (!current) return { error: "Order not found." };
  if (current.order_status === "delivered") {
    return { error: "A delivered order can only be refunded, not cancelled." };
  }

  const { data: ok, error: rpcError } = await supabase.rpc("cancel_order_atomic", {
    p_order_id: orderId,
    p_new_order_status: "cancelled",
  });

  if (rpcError) return { error: rpcError.message };
  if (!ok) return { error: "This order can no longer be cancelled." };

  const { data: order } = await supabase
    .from("orders")
    .select("order_number, customer_name, customer_email")
    .eq("id", orderId)
    .maybeSingle();

  if (order) {
    await sendOrderStatusEmail({
      orderNumber: order.order_number,
      customerName: order.customer_name,
      customerEmail: order.customer_email,
      label: "Cancelled",
    });
  }

  revalidateOrderPaths(orderId);
  return { success: true };
}

export async function refundOrder(orderId: string): Promise<OrderActionResult> {
  const supabase = await requireAdminClient();

  const { data: current, error: fetchError } = await supabase
    .from("orders")
    .select("payment_status")
    .eq("id", orderId)
    .maybeSingle();

  if (fetchError) return { error: fetchError.message };
  if (!current || current.payment_status !== "paid") {
    return { error: "Only a paid order can be refunded." };
  }

  const { data: ok, error: rpcError } = await supabase.rpc("cancel_order_atomic", {
    p_order_id: orderId,
    p_new_order_status: "returned",
    p_new_payment_status: "refunded",
  });

  if (rpcError) return { error: rpcError.message };
  if (!ok) return { error: "This order can no longer be refunded." };

  const { data: order } = await supabase
    .from("orders")
    .select("order_number, customer_name, customer_email")
    .eq("id", orderId)
    .maybeSingle();

  if (order) {
    await sendOrderStatusEmail({
      orderNumber: order.order_number,
      customerName: order.customer_name,
      customerEmail: order.customer_email,
      label: "Refunded",
    });
  }

  revalidateOrderPaths(orderId);
  return { success: true };
}

// Only reachable from "out_for_delivery" (mark_delivery_failed enforces
// this server-side too, not just via the UI gate) — failed_delivery is
// an exception branch off that one step, never a linear/appended one.
export async function markDeliveryFailed(orderId: string, reason: string): Promise<OrderActionResult> {
  const supabase = await requireAdminClient();

  const trimmedReason = reason.trim();
  if (!trimmedReason) return { error: "A failure reason is required." };

  const { data: ok, error: rpcError } = await supabase.rpc("mark_delivery_failed", {
    p_order_id: orderId,
    p_reason: trimmedReason,
  });

  if (rpcError) return { error: rpcError.message };
  if (!ok) return { error: "This order is not out for delivery." };

  const { data: order } = await supabase
    .from("orders")
    .select("order_number, customer_name, customer_email")
    .eq("id", orderId)
    .maybeSingle();

  if (order) {
    const isAddressIssue = trimmedReason.toLowerCase().includes("address");
    // Read from Settings rather than a default: this link goes out in an
    // e-mail, where a stale number is impossible to correct after the fact.
    const general = await getGeneralSettings();
    const whatsappLink = getWhatsAppUrl(
      `Hi, delivery of my order ${order.order_number} failed — I'd like to sort this out.`,
      general.whatsappNumber,
    );
    await sendOrderStatusEmail({
      orderNumber: order.order_number,
      customerName: order.customer_name,
      customerEmail: order.customer_email,
      label: "Delivery Attempt Failed",
      detail: `Reason: ${trimmedReason}. This isn't the end of the road — we'll re-attempt delivery once this is resolved.${
        isAddressIssue ? " Please confirm or correct your delivery address so we can try again." : ""
      } <a href="${whatsappLink}">Message us on WhatsApp</a> to resolve it quickly.`,
    });
  }

  revalidateOrderPaths(orderId);
  return { success: true };
}

// Resolution path #1 from failed_delivery: try again. Only reachable
// from "failed_delivery" (reattempt_delivery enforces this server-side).
export async function reattemptDelivery(orderId: string): Promise<OrderActionResult> {
  const supabase = await requireAdminClient();

  const { data: ok, error: rpcError } = await supabase.rpc("reattempt_delivery", {
    p_order_id: orderId,
  });

  if (rpcError) return { error: rpcError.message };
  if (!ok) return { error: "This order is not marked as a failed delivery." };

  const { data: order } = await supabase
    .from("orders")
    .select("order_number, customer_name, customer_email")
    .eq("id", orderId)
    .maybeSingle();

  if (order) {
    await sendOrderStatusEmail({
      orderNumber: order.order_number,
      customerName: order.customer_name,
      customerEmail: order.customer_email,
      label: "Out for Delivery",
      detail: "We're re-attempting delivery of your order.",
    });
  }

  revalidateOrderPaths(orderId);
  return { success: true };
}

// Resolution path #2 from failed_delivery: the order won't be
// re-attempted, so it comes back to us — stock restored, same
// cancel_order_atomic primitive cancelOrder/refundOrder already use.
// Deliberately distinct from refundOrder: this doesn't touch
// payment_status (a COD order that never collected payment has nothing
// to refund; a paid order can still be refunded separately afterward).
export async function markOrderReturned(orderId: string): Promise<OrderActionResult> {
  const supabase = await requireAdminClient();

  const { data: ok, error: rpcError } = await supabase.rpc("cancel_order_atomic", {
    p_order_id: orderId,
    p_new_order_status: "returned",
    p_note: "Returned after failed delivery",
  });

  if (rpcError) return { error: rpcError.message };
  if (!ok) return { error: "This order can no longer be marked returned." };

  const { data: order } = await supabase
    .from("orders")
    .select("order_number, customer_name, customer_email")
    .eq("id", orderId)
    .maybeSingle();

  if (order) {
    await sendOrderStatusEmail({
      orderNumber: order.order_number,
      customerName: order.customer_name,
      customerEmail: order.customer_email,
      label: "Returned",
    });
  }

  revalidateOrderPaths(orderId);
  return { success: true };
}

export interface BulkOrderActionResult {
  successCount: number;
  errors: string[];
  // Orders the bulk action deliberately did NOT touch, grouped by reason
  // -- distinct from errors, which are failures. See bulkMarkDelivered.
  skipped?: { orderIds: string[]; reason: string }[];
}

// Loops the existing single-order actions (confirmOrder/cancelOrder) one
// id at a time rather than a raw batched .update().in() — those actions
// carry business-rule checks (only-pending guard, stock restore via
// cancel_order_atomic, the status-change email) that a raw batched update
// would silently skip. Mirrors lib/admin/products-mutations.ts's
// bulkDuplicate, the one existing bulk action in this codebase that also
// needs per-row business logic rather than a single-shot field update.
export async function bulkConfirmOrders(orderIds: string[]): Promise<BulkOrderActionResult> {
  const errors: string[] = [];
  let successCount = 0;
  for (const id of orderIds) {
    const result = await confirmOrder(id);
    if ("error" in result) errors.push(result.error);
    else successCount += 1;
  }
  return { successCount, errors };
}

export async function bulkCancelOrders(orderIds: string[]): Promise<BulkOrderActionResult> {
  const errors: string[] = [];
  let successCount = 0;
  for (const id of orderIds) {
    const result = await cancelOrder(id);
    if ("error" in result) errors.push(result.error);
    else successCount += 1;
  }
  return { successCount, errors };
}

// Packaging → Ready to Ship. advanceOrderStatus is the same function the
// row-level "Mark Packed" button calls, so bulk and single-order can't
// drift: whatever one does to an order, the other does identically.
export async function bulkMarkPacked(orderIds: string[]): Promise<BulkOrderActionResult> {
  const errors: string[] = [];
  let successCount = 0;
  for (const id of orderIds) {
    const result = await advanceOrderStatus(id);
    if ("error" in result) errors.push(result.error);
    else successCount += 1;
  }
  return { successCount, errors };
}

// Ready to Ship → Out for Delivery. No tracking required; see
// markOrderOutForDelivery for why this doesn't reuse markOrderShipped.
export async function bulkMarkOutForDelivery(orderIds: string[]): Promise<BulkOrderActionResult> {
  const errors: string[] = [];
  let successCount = 0;
  for (const id of orderIds) {
    const result = await markOrderOutForDelivery(id);
    if ("error" in result) errors.push(result.error);
    else successCount += 1;
  }
  return { successCount, errors };
}

// Out for Delivery → Delivered.
//
// Two groups are deliberately SKIPPED rather than delivered, both
// mirroring what the row-level UI already does on this tab:
//
//  * Orders still at 'shipped'. The Out for Delivery tab holds 'shipped',
//    'out_for_delivery' and 'failed_delivery', and its row UI shows a
//    "Mark Out for Delivery" button for a shipped order rather than a
//    "Mark Delivered" one -- markOrderDelivered accepts 'out_for_delivery'
//    alone. Delivering them here would either fail with a misleading
//    "status changed, please refresh" or silently skip a pipeline stage.
//  * Unpaid Cash on Delivery orders. markOrderDelivered also writes
//    payment_status for those -- 'paid' if cash was collected, 'failed' if
//    not -- so a bulk call with no answer would record every unpaid COD
//    customer as a failed payment, including the ones who did pay. Money
//    state is never guessed: staff mark these individually, where the cash
//    prompt is shown.
//
// Everything else goes through the same markOrderDelivered the row button
// calls.
export async function bulkMarkDelivered(orderIds: string[]): Promise<BulkOrderActionResult> {
  if (orderIds.length === 0) return { successCount: 0, errors: [] };
  const supabase = await requireAdminClient();

  const { data: rows, error } = await supabase
    .from("orders")
    .select("id, payment_method, payment_status, order_status")
    .in("id", orderIds);

  if (error) return { successCount: 0, errors: [error.message] };

  const byId = new Map((rows ?? []).map((r) => [r.id, r]));
  const notOutForDelivery: string[] = [];
  const unpaidCod: string[] = [];
  const deliverable: string[] = [];

  for (const id of orderIds) {
    const row = byId.get(id);
    if (!row) continue;
    if (row.order_status !== "out_for_delivery") notOutForDelivery.push(id);
    else if (row.payment_method === "cod" && row.payment_status !== "paid") unpaidCod.push(id);
    else deliverable.push(id);
  }

  const errors: string[] = [];
  let successCount = 0;
  for (const id of deliverable) {
    const result = await markOrderDelivered(id);
    if ("error" in result) errors.push(result.error);
    else successCount += 1;
  }

  const skipped: { orderIds: string[]; reason: string }[] = [];
  if (notOutForDelivery.length > 0) {
    skipped.push({
      orderIds: notOutForDelivery,
      reason: "not out for delivery yet — mark them out for delivery first",
    });
  }
  if (unpaidCod.length > 0) {
    skipped.push({
      orderIds: unpaidCod,
      reason: "unpaid Cash on Delivery — mark individually to record whether cash was collected",
    });
  }

  return { successCount, errors, ...(skipped.length > 0 ? { skipped } : {}) };
}

// Server-action wrapper so the client table can ask for "every order
// matching this tab and these filters", for the select-all-beyond-this-
// page banner. The query itself lives in orders-query.ts alongside the
// paginated one, sharing its filter clauses so the two can never select
// different sets; this adds the admin guard, since a Server Action is
// callable by any signed-in user and RLS alone would otherwise just hand
// a customer their own order ids.
export async function getOrderIdsForCurrentFilters(
  filters: AdminOrderFilterState,
): Promise<string[]> {
  await requireAdminClient();
  return getAdminOrderIdsForFilters(filters);
}
