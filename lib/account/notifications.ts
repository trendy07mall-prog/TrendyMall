"use server";

import { createClient } from "@/lib/supabase/server";
import { ORDER_STATUS_LABELS } from "@/lib/admin/orderStatusFlow";
import type { OrderFulfillmentStatus } from "@/types";

export interface AccountNotification {
  id: string;
  orderId: string;
  orderNumber: string;
  statusLabel: string;
  note: string | null;
  createdAt: string;
}

// No customer notification backend exists anywhere in this codebase
// (confirmed by audit — every "notification" hit is either an admin-owner
// alert, a write-only stock-notify capture, or a session-only toast). This
// is the smallest safe real addition: order_status_history already exists,
// is already RLS-scoped to the caller's own orders (order_status_history_
// select_own_or_admin, the same policy lib/orders/order-detail.ts's
// statusHistory read already relies on), and already records every status
// change with a timestamp — this is a new READ over it, no new table, no
// new trigger, no write path added anywhere.
export async function getMyNotifications(limit = 30): Promise<AccountNotification[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("order_status_history")
    .select("id, order_id, new_value, note, created_at, orders(order_number)")
    .eq("field", "order_status")
    .order("created_at", { ascending: false })
    .limit(limit);

  // orders(order_number) is an embedded-resource join, not a typed
  // relationship query -- same pragmatic escape hatch already used in
  // lib/account/orders-query.ts and lib/orders/order-detail.ts.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((row) => ({
    id: row.id,
    orderId: row.order_id,
    orderNumber: row.orders?.order_number ?? "—",
    statusLabel: ORDER_STATUS_LABELS[row.new_value as OrderFulfillmentStatus] ?? row.new_value,
    note: row.note,
    createdAt: row.created_at,
  }));
}
