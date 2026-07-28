"use server";

import { revalidatePath } from "next/cache";
import { requireAdminClient } from "@/lib/admin/guard";
import { sendPaymentVerifiedEmail } from "@/lib/email";

export type VerifyPaymentResult = { success: true } | { error: string };

// Two related updates, not wrapped in a Postgres function — unlike order
// creation there's no pricing/stock logic here, so sequential .update()
// calls carry none of the race-condition risk that justified an RPC for
// create_order_atomic. Stock was already reduced at order-placement time
// (Phase 3's stock-timing decision), so verification never touches it.
export async function verifyBankTransferPayment(orderId: string): Promise<VerifyPaymentResult> {
  const supabase = await requireAdminClient();

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .update({ payment_status: "paid", order_status: "confirmed" })
    .eq("id", orderId)
    .eq("payment_status", "awaiting_verification")
    .select("order_number, customer_name, customer_email")
    .maybeSingle();

  if (orderError) return { error: orderError.message };
  if (!order) return { error: "This order is not awaiting payment verification." };

  await supabase
    .from("payments")
    .update({ status: "paid" })
    .eq("order_id", orderId);

  await sendPaymentVerifiedEmail({
    orderNumber: order.order_number,
    customerName: order.customer_name,
    customerEmail: order.customer_email,
  });

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/account/orders");
  revalidatePath(`/account/orders/${orderId}`);
  return { success: true };
}
