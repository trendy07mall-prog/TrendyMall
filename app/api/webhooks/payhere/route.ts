import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyNotifySignature, isPayHereEnabled, PAYHERE_STATUS } from "@/lib/payhere";
import { sendPaymentVerifiedEmail, sendPaymentReceivedNotification } from "@/lib/email";
import { getNotificationSettings } from "@/lib/data/settings";

// PayHere's notify_url — the reliable server-to-server payment
// confirmation (never the customer's browser return_url). No user
// session exists here (PayHere calls this directly, no cookies), so this
// uses the service-role client — trust comes entirely from verifying
// md5sig below, not from auth. Runs the same stock-restore logic
// cancel_order_atomic (Phase 4) encodes, but inline via direct table
// updates + restore_stock()/reduce_stock() (Phase 1, no internal
// is_admin() gate) rather than calling cancel_order_atomic itself — that
// RPC's own is_admin() check assumes an authenticated admin session,
// which doesn't exist for a service-role-authenticated webhook call.
export async function POST(request: Request) {
  // PAYHERE_MERCHANT_SECRET being unset would otherwise crash
  // verifyNotifySignature with an unhandled exception (Node's crypto
  // hash rejects an undefined input) — fail cleanly instead.
  if (!isPayHereEnabled()) {
    return NextResponse.json({ error: "PayHere is not configured" }, { status: 503 });
  }

  const formData = await request.formData();
  const payload = {
    merchant_id: String(formData.get("merchant_id") ?? ""),
    order_id: String(formData.get("order_id") ?? ""),
    payment_id: String(formData.get("payment_id") ?? ""),
    payhere_amount: String(formData.get("payhere_amount") ?? ""),
    payhere_currency: String(formData.get("payhere_currency") ?? ""),
    status_code: String(formData.get("status_code") ?? ""),
    md5sig: String(formData.get("md5sig") ?? ""),
  };

  if (!verifyNotifySignature(payload)) {
    console.error("PayHere webhook: signature verification failed", {
      order_id: payload.order_id,
    });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const rawPayload = Object.fromEntries(formData.entries());
  const supabase = createAdminClient();

  const { data: order } = await supabase
    .from("orders")
    .select("id, order_number, total, customer_name, customer_email")
    .eq("order_number", payload.order_id)
    .maybeSingle();

  if (!order) {
    console.error("PayHere webhook: order not found", { order_id: payload.order_id });
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const { data: payment } = await supabase
    .from("payments")
    .select("id, status")
    .eq("order_id", order.id)
    .maybeSingle();

  // Idempotency: a duplicate callback is a no-op once the payment is
  // already in a terminal state.
  if (payment && ["paid", "failed", "cancelled"].includes(payment.status)) {
    return NextResponse.json({ received: true });
  }

  if (payload.status_code === PAYHERE_STATUS.SUCCESS) {
    // Defense in depth: the signature proves the callback came from
    // PayHere, but not that the amount matches this order — check anyway.
    const amountMatches = Math.abs(Number(payload.payhere_amount) - order.total) < 0.01;
    if (!amountMatches) {
      console.error("PayHere webhook: amount mismatch", {
        order_id: payload.order_id,
        expected: order.total,
        received: payload.payhere_amount,
      });
      return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
    }

    await supabase
      .from("payments")
      .update({
        status: "paid",
        transaction_id: payload.payment_id,
        raw_gateway_response: rawPayload,
      })
      .eq("order_id", order.id);

    await supabase
      .from("orders")
      .update({ payment_status: "paid", order_status: "confirmed" })
      .eq("id", order.id);

    await sendPaymentVerifiedEmail({
      orderNumber: order.order_number,
      customerName: order.customer_name,
      customerEmail: order.customer_email,
    });

    const notifications = await getNotificationSettings();
    if (notifications.paymentReceivedEnabled) {
      await sendPaymentReceivedNotification({
        orderNumber: order.order_number,
        customerName: order.customer_name,
        paymentMethod: "Card (PayHere)",
        total: order.total,
      });
    }
  } else if (
    payload.status_code === PAYHERE_STATUS.CANCELLED ||
    payload.status_code === PAYHERE_STATUS.FAILED
  ) {
    const newStatus = payload.status_code === PAYHERE_STATUS.CANCELLED ? "cancelled" : "failed";

    await supabase
      .from("payments")
      .update({ status: newStatus, raw_gateway_response: rawPayload })
      .eq("order_id", order.id);

    // Restore stock for every line item — stock was reduced at order
    // creation (same as COD/bank transfer), so a declined/cancelled card
    // payment must give it back, same as Phase 4's admin Cancel action.
    const { data: items } = await supabase
      .from("order_items")
      .select("product_id, quantity")
      .eq("order_id", order.id);

    for (const item of items ?? []) {
      if (item.product_id) {
        await supabase.rpc("restore_stock", {
          p_product_id: item.product_id,
          p_quantity: item.quantity,
        });
      }
    }

    await supabase.from("orders").update({ order_status: "cancelled" }).eq("id", order.id);
  } else {
    // PENDING or CHARGEDBACK: record the raw payload only, no automatic
    // status/stock change — pending is transient, a chargeback is a
    // contested dispute needing human review, not an automatic action.
    await supabase
      .from("payments")
      .update({ raw_gateway_response: rawPayload })
      .eq("order_id", order.id);
  }

  return NextResponse.json({ received: true });
}
