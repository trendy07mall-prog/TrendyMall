import { createClient } from "@/lib/supabase/server";
import type { AccountOrderFilterState } from "@/lib/account/order-filters";
import type { OrderFulfillmentStatus, PaymentStatus } from "@/types";

export const ACCOUNT_ORDERS_PAGE_SIZE = 10;

// "Active" groups every non-terminal status, including failed_delivery
// (still resolving, not done); "Cancelled" groups both cancelled and
// returned (both "didn't complete," from a customer's point of view).
const ACTIVE_STATUSES: OrderFulfillmentStatus[] = [
  "pending", "confirmed", "packing", "shipped", "out_for_delivery", "failed_delivery",
];
const CANCELLED_STATUSES: OrderFulfillmentStatus[] = ["cancelled", "returned"];

export interface AccountOrderRow {
  id: string;
  order_number: string;
  total: number;
  payment_method: string;
  payment_status: PaymentStatus;
  order_status: OrderFulfillmentStatus;
  created_at: string;
  itemCount: number;
  thumbnails: string[];
}

export interface AccountOrdersPage {
  orders: AccountOrderRow[];
  totalCount: number;
}

// Mirrors lib/admin/orders-query.ts's .range()/{count:"exact"}/conditional-
// filter shape exactly, using the plain RLS-scoped client — no explicit
// user_id filter needed, orders_select_own_or_admin already restricts
// every row to the caller's own (an admin viewing this page would also
// only see their own orders, since is_admin() is irrelevant here — this
// query never claims to be an admin view).
export async function getMyOrders(
  filters: AccountOrderFilterState,
  page = 1,
  pageSize = ACCOUNT_ORDERS_PAGE_SIZE,
): Promise<AccountOrdersPage> {
  const supabase = await createClient();

  let query = supabase.from("orders").select(
    "id, order_number, total, payment_method, payment_status, order_status, created_at, order_items(product_image_url)",
    { count: "exact" },
  );

  if (filters.search.trim()) {
    const term = filters.search.trim().replace(/[%,]/g, "");
    query = query.ilike("order_number", `%${term}%`);
  }
  if (filters.tab === "active") query = query.in("order_status", ACTIVE_STATUSES);
  else if (filters.tab === "delivered") query = query.eq("order_status", "delivered");
  else if (filters.tab === "cancelled") query = query.in("order_status", CANCELLED_STATUSES);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, count, error } = await query.order("created_at", { ascending: false }).range(from, to);

  if (error || !data) return { orders: [], totalCount: 0 };

  // order_items(product_image_url) is a raw select-string join, not a
  // typed relationship query — same pragmatic escape hatch already used
  // in lib/admin/orders-query.ts for the equivalent count join.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = data as any[];

  return {
    orders: rows.map((row) => {
      const items = (row.order_items ?? []) as { product_image_url: string | null }[];
      return {
        id: row.id,
        order_number: row.order_number,
        total: row.total,
        payment_method: row.payment_method,
        payment_status: row.payment_status,
        order_status: row.order_status,
        created_at: row.created_at,
        itemCount: items.length,
        thumbnails: items
          .map((item) => item.product_image_url)
          .filter((url): url is string => Boolean(url))
          .slice(0, 3),
      };
    }),
    totalCount: count ?? 0,
  };
}
