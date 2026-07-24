"use server";

import { revalidatePath } from "next/cache";
import { requireAdminClient } from "@/lib/admin/guard";
import { sendOrderStatusUpdateEmail } from "@/lib/email";
import type { OrderStatus } from "@/types";

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  const supabase = await requireAdminClient();
  const { data: order, error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", orderId)
    .select("order_number, customer_name, customer_email")
    .single();

  if (error) throw new Error(error.message);

  if (order) {
    await sendOrderStatusUpdateEmail({
      orderNumber: order.order_number,
      customerName: order.customer_name,
      customerEmail: order.customer_email,
      status,
    });
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/account/orders");
}
