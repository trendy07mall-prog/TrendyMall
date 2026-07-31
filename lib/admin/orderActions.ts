"use server";

import { revalidatePath } from "next/cache";
import { requireAdminClient } from "@/lib/admin/guard";
import { sendOrderStatusEmail } from "@/lib/email";
import { getNextOrderStatus, ORDER_STATUS_LABELS } from "@/lib/admin/orderStatusFlow";
import { getWhatsAppUrl } from "@/lib/site";

export type OrderActionResult = { success: true } | { error: string };

function revalidateOrderPaths(orderId: string) {
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin");
  revalidatePath("/account/orders");
  revalidatePath(`/account/orders/${orderId}`);
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
    .select("order_number, customer_name, customer_email")
    .maybeSingle();

  if (error) return { error: error.message };
  if (!order) return { error: "Order not found." };

  await sendOrderStatusEmail({
    orderNumber: order.order_number,
    customerName: order.customer_name,
    customerEmail: order.customer_email,
    label: "Payment Received",
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
export async function advanceOrderStatus(orderId: string): Promise<OrderActionResult> {
  const supabase = await requireAdminClient();

  const { data: current } = await supabase
    .from("orders")
    .select("order_status")
    .eq("id", orderId)
    .maybeSingle();

  if (!current) return { error: "Order not found." };

  const next = getNextOrderStatus(current.order_status);
  if (!next) return { error: "This order has no further status to advance to." };

  const { data: order, error } = await supabase
    .from("orders")
    .update({ order_status: next })
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
    const whatsappLink = getWhatsAppUrl(`Hi, delivery of my order ${order.order_number} failed — I'd like to sort this out.`);
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
