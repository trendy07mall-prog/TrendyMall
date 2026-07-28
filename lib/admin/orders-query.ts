import { createClient } from "@/lib/supabase/server";
import type { AdminOrderFilterState } from "@/lib/admin/order-filters";
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
}

export interface AdminOrdersPage {
  orders: AdminOrderRow[];
  totalCount: number;
}

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

  let query = supabase
    .from("orders")
    .select(
      "id, order_number, customer_name, customer_phone, total, payment_method, payment_status, order_status, created_at, order_items(count)",
      { count: "exact" },
    );

  if (filters.search.trim()) {
    const term = filters.search.trim().replace(/[%,]/g, "");
    query = query.or(
      `order_number.ilike.%${term}%,customer_name.ilike.%${term}%,customer_phone.ilike.%${term}%`,
    );
  }
  if (filters.orderStatus) query = query.eq("order_status", filters.orderStatus);
  if (filters.paymentMethod) query = query.eq("payment_method", filters.paymentMethod);
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

  return {
    orders: rows.map((row) => ({
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
    })),
    totalCount: count ?? 0,
  };
}
