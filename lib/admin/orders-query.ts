import { createClient } from "@/lib/supabase/server";
import type { AdminOrderFilterState } from "@/lib/admin/order-filters";
import { ADMIN_ORDER_TAB_STATUSES, type AdminOrderTab } from "@/lib/admin/orderStatusFlow";
import type { OrderFulfillmentStatus, PaymentStatus } from "@/types";

export const ADMIN_ORDERS_PAGE_SIZE = 20;

export interface AdminOrderRow {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  total: number;
  payment_method: string;
  payment_status: PaymentStatus;
  order_status: OrderFulfillmentStatus;
  created_at: string;
  itemCount: number;
  courier: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  delivery_failure_reason: string | null;
  delivery_attempt_count: number;
  dispatchedAt: string | null;
  deliveredAt: string | null;
  cancelReason: string | null;
  cancelledByName: string | null;
}

export interface AdminOrdersPage {
  orders: AdminOrderRow[];
  totalCount: number;
}

const ORDER_ROW_SELECT =
  "id, order_number, customer_name, customer_phone, total, payment_method, payment_status, " +
  "order_status, created_at, courier, tracking_number, tracking_url, delivery_failure_reason, " +
  "delivery_attempt_count, order_items(count)";

// Mirrors lib/admin/products-query.ts's getAdminProducts: real server-side
// .range() pagination, URL-driven filters, search via .or()/ilike. The
// embedded order_items(count) resource gets the per-order item count in
// the same query, avoiding an N+1.
export async function getAdminOrders(
  filters: AdminOrderFilterState,
  page = 1,
  pageSize = ADMIN_ORDERS_PAGE_SIZE,
): Promise<AdminOrdersPage> {
  const supabase = await createClient();

  let query = supabase.from("orders").select(ORDER_ROW_SELECT, { count: "exact" });

  const statuses = ADMIN_ORDER_TAB_STATUSES[filters.tab];
  if (statuses) query = query.in("order_status", statuses);

  if (filters.search.trim()) {
    const term = filters.search.trim().replace(/[%,]/g, "");
    query = query.or(
      `order_number.ilike.%${term}%,customer_name.ilike.%${term}%,customer_phone.ilike.%${term}%,tracking_number.ilike.%${term}%`,
    );
  }
  if (filters.paymentMethod) query = query.eq("payment_method", filters.paymentMethod);
  if (filters.paymentStatus) query = query.eq("payment_status", filters.paymentStatus);
  if (filters.courier.trim()) query = query.ilike("courier", `%${filters.courier.trim()}%`);
  if (filters.dateFrom) query = query.gte("created_at", `${filters.dateFrom}T00:00:00`);
  if (filters.dateTo) query = query.lte("created_at", `${filters.dateTo}T23:59:59`);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error || !data) return { orders: [], totalCount: 0 };

  // The embedded order_items(count) resource isn't represented in the
  // generated Database types (it's a raw select-string join, not a typed
  // relationship query) — cast row-by-row rather than fighting the
  // generic Supabase builder types for one field, matching the same
  // pragmatic `any` escape hatch already used in products-query.ts.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = data as any[];

  const orders: AdminOrderRow[] = rows.map((row) => ({
    id: row.id,
    order_number: row.order_number,
    customer_name: row.customer_name,
    customer_phone: row.customer_phone,
    total: row.total,
    payment_method: row.payment_method,
    payment_status: row.payment_status,
    order_status: row.order_status,
    created_at: row.created_at,
    itemCount: row.order_items?.[0]?.count ?? 0,
    courier: row.courier,
    tracking_number: row.tracking_number,
    tracking_url: row.tracking_url,
    delivery_failure_reason: row.delivery_failure_reason,
    delivery_attempt_count: row.delivery_attempt_count,
    dispatchedAt: null,
    deliveredAt: null,
    cancelReason: null,
    cancelledByName: null,
  }));

  // Per-tab timestamp/reason enrichment from order_status_history — the
  // correct source for "when did this order first reach status X"
  // (orders.updated_at is wrong: it reflects any later edit, e.g. a
  // tracking-number correction after shipping). One batched query for
  // every order on the page, not N+1.
  if (filters.tab === "out_for_delivery" && orders.length > 0) {
    await attachFirstReachedTimestamp(supabase, orders, "out_for_delivery", (order, ts) => {
      order.dispatchedAt = ts;
    });
  }
  if (filters.tab === "delivered" && orders.length > 0) {
    await attachFirstReachedTimestamp(supabase, orders, "delivered", (order, ts) => {
      order.deliveredAt = ts;
    });
  }
  if (filters.tab === "cancelled" && orders.length > 0) {
    const { data: history } = await supabase
      .from("order_status_history")
      .select("order_id, note, changed_by")
      .in(
        "order_id",
        orders.map((o) => o.id),
      )
      .eq("field", "order_status")
      .eq("new_value", "cancelled")
      .order("created_at", { ascending: true });

    const changedByIds = [...new Set((history ?? []).map((h) => h.changed_by).filter((id): id is string => !!id))];
    const nameById = new Map<string, string>();
    if (changedByIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", changedByIds);
      for (const p of profiles ?? []) {
        if (p.full_name) nameById.set(p.id, p.full_name);
      }
    }

    const reasonByOrderId = new Map<string, string | null>();
    const changedByOrderId = new Map<string, string | null>();
    for (const entry of history ?? []) {
      if (!reasonByOrderId.has(entry.order_id)) {
        // cancelOrder doesn't pass a note (only refundOrder/markOrderReturned
        // do) — the logging trigger still writes a row with note = "" rather
        // than null, so treat blank the same as "not recorded".
        reasonByOrderId.set(entry.order_id, entry.note || null);
        changedByOrderId.set(entry.order_id, entry.changed_by ? (nameById.get(entry.changed_by) ?? null) : null);
      }
    }
    for (const order of orders) {
      order.cancelReason = reasonByOrderId.get(order.id) ?? null;
      order.cancelledByName = changedByOrderId.get(order.id) ?? null;
    }
  }

  return { orders, totalCount: count ?? 0 };
}

async function attachFirstReachedTimestamp(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orders: AdminOrderRow[],
  status: OrderFulfillmentStatus,
  assign: (order: AdminOrderRow, timestamp: string) => void,
): Promise<void> {
  const { data: history } = await supabase
    .from("order_status_history")
    .select("order_id, created_at")
    .in(
      "order_id",
      orders.map((o) => o.id),
    )
    .eq("field", "order_status")
    .eq("new_value", status)
    .order("created_at", { ascending: true });

  const timestampByOrderId = new Map<string, string>();
  for (const entry of history ?? []) {
    if (!timestampByOrderId.has(entry.order_id)) {
      timestampByOrderId.set(entry.order_id, entry.created_at);
    }
  }
  for (const order of orders) {
    const ts = timestampByOrderId.get(order.id);
    if (ts) assign(order, ts);
  }
}

// One small head-count query per tab, run in parallel — no RPC/migration,
// stays entirely app-layer. Cheap: order_status is indexed and every query
// is count-only (head: true fetches no rows).
export async function getAdminOrderStatusCounts(): Promise<Record<AdminOrderTab, number>> {
  const supabase = await createClient();
  const tabs = Object.keys(ADMIN_ORDER_TAB_STATUSES) as AdminOrderTab[];

  const results = await Promise.all(
    tabs.map(async (tab) => {
      const statuses = ADMIN_ORDER_TAB_STATUSES[tab];
      let query = supabase.from("orders").select("id", { count: "exact", head: true });
      if (statuses) query = query.in("order_status", statuses);
      const { count } = await query;
      return [tab, count ?? 0] as const;
    }),
  );

  return Object.fromEntries(results) as Record<AdminOrderTab, number>;
}
