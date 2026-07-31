"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type CancelOrderResult = { success: true } | { error: string };

// Calls cancel_own_order (sql/041) — a security-definer RPC scoped to
// auth.uid() = orders.user_id and order_status in ('pending','confirmed'),
// deliberately narrower than the admin-only cancel_order_atomic. The RPC
// itself is the real authorization boundary; this Server Action is just
// the thin caller + cache revalidation.
export async function cancelMyOrder(orderId: string): Promise<CancelOrderResult> {
  const supabase = await createClient();

  const { data: ok, error } = await supabase.rpc("cancel_own_order", { p_order_id: orderId });

  if (error) return { error: error.message };
  if (!ok) return { error: "This order can no longer be cancelled." };

  revalidatePath(`/account/orders/${orderId}`);
  revalidatePath("/account/orders");
  return { success: true };
}
