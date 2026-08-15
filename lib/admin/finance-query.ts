import { createClient } from "@/lib/supabase/server";
import { sriLankaDateKey } from "@/lib/admin/finance-shared";
import type { FinanceOrderFilterState } from "@/lib/admin/finance-filters";
import type { PaymentGateway } from "@/types";
import type {
  FinanceRangeWindow,
  FinanceOverview,
  FinanceOrderRow,
  FinanceOrdersPage,
  ProductPerformanceRow,
} from "@/lib/admin/finance-shared";

export type {
  FinanceRange,
  FinanceRangeWindow,
  FinanceKpis,
  FinanceSalesPoint,
  FinanceRevenueBreakdown,
  FinancePaymentMethodStat,
  FinanceOverview,
  FinanceOrderRow,
  FinanceOrdersPage,
  ProductPerformanceRow,
} from "@/lib/admin/finance-shared";
export { FINANCE_RANGE_LABELS, resolveFinanceRangeWindow } from "@/lib/admin/finance-shared";

// Plain createClient (not requireAdminClient) -- every function here is
// only ever called from a page under app/admin/finance/**, which already
// sits behind app/admin/layout.tsx's own auth/is_admin guard, same
// convention lib/admin/dashboard-query.ts and every other admin *page*
// data fetcher already follows. requireAdminClient is reserved for Server
// Actions (finance-export.ts), reachable via direct POST outside that layout.

// Every order counted as revenue anywhere below excludes exactly these two
// statuses -- the same rule already established by
// lib/admin/dashboard-query.ts's NOT_CANCELLED_RETURNED and
// lib/admin/campaign-analytics.ts's getCampaignOrderStats. One rule, reused
// everywhere money is summed, never redefined differently in a second place.
const NOT_CANCELLED_RETURNED = "(cancelled,returned)";

const ALL_PAYMENT_METHODS: PaymentGateway[] = ["cod", "bank_transfer", "payhere"];

function bucketFor(from: Date, to: Date): "day" | "week" | "month" {
  const days = (to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000);
  if (days <= 31) return "day";
  if (days <= 180) return "week";
  return "month";
}

function bucketKeyAndLabel(date: Date, bucket: "day" | "week" | "month", from: Date): { key: string; label: string } {
  if (bucket === "day") {
    const key = sriLankaDateKey(date);
    return { key, label: key };
  }
  if (bucket === "month") {
    const key = sriLankaDateKey(date).slice(0, 7); // "YYYY-MM"
    return { key, label: key };
  }
  // week: bucketed as N-day blocks from the range start, labeled by the
  // block's own start date -- simple and stable, not a calendar-ISO-week
  // (which would straddle the range boundary inconsistently).
  const fromDayKey = sriLankaDateKey(from);
  const fromDayStart = new Date(`${fromDayKey}T00:00:00Z`).getTime();
  const dateDayKey = sriLankaDateKey(date);
  const dateDayStart = new Date(`${dateDayKey}T00:00:00Z`).getTime();
  const dayIndex = Math.floor((dateDayStart - fromDayStart) / (24 * 60 * 60 * 1000));
  const weekIndex = Math.floor(dayIndex / 7);
  const weekStart = new Date(fromDayStart + weekIndex * 7 * 24 * 60 * 60 * 1000);
  const key = sriLankaDateKey(weekStart);
  return { key, label: `Week of ${key}` };
}

// One query for every not-cancelled/returned order in range covers
// totalSales, the full revenue breakdown, the payment-method split, and the
// sales chart -- all four derive from the exact same row set, so they're
// computed from one fetch rather than four separate ones that could drift
// out of sync with each other.
export async function getFinanceOverview(window: FinanceRangeWindow): Promise<FinanceOverview> {
  const supabase = await createClient();
  const { from, to } = window;

  const [{ data: activeOrders }, { data: paidOrders }, { data: pendingOrders }, { count: ordersCount }, { data: refundedOrders }] =
    await Promise.all([
      supabase
        .from("orders")
        .select("subtotal, discount, shipping_fee, total, payment_method, created_at")
        .gte("created_at", from.toISOString())
        .lte("created_at", to.toISOString())
        .not("order_status", "in", NOT_CANCELLED_RETURNED),
      supabase
        .from("orders")
        .select("total")
        .gte("created_at", from.toISOString())
        .lte("created_at", to.toISOString())
        .eq("payment_status", "paid"),
      supabase
        .from("orders")
        .select("total")
        .gte("created_at", from.toISOString())
        .lte("created_at", to.toISOString())
        .in("payment_status", ["pending", "awaiting_verification"]),
      supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .gte("created_at", from.toISOString())
        .lte("created_at", to.toISOString()),
      supabase
        .from("orders")
        .select("total")
        .gte("created_at", from.toISOString())
        .lte("created_at", to.toISOString())
        .eq("payment_status", "refunded"),
    ]);

  const rows = activeOrders ?? [];

  let totalSales = 0;
  let productSales = 0;
  let deliveryCharges = 0;
  let discounts = 0;
  const byMethod = new Map<PaymentGateway, { count: number; amount: number }>();
  for (const method of ALL_PAYMENT_METHODS) byMethod.set(method, { count: 0, amount: 0 });

  const bucket = bucketFor(from, to);
  const seriesMap = new Map<string, { label: string; total: number }>();

  for (const o of rows) {
    totalSales += o.total;
    productSales += o.subtotal;
    deliveryCharges += o.shipping_fee;
    discounts += o.discount;

    const methodStat = byMethod.get(o.payment_method as PaymentGateway);
    if (methodStat) {
      methodStat.count += 1;
      methodStat.amount += o.total;
    }

    const { key, label } = bucketKeyAndLabel(new Date(o.created_at), bucket, from);
    const existing = seriesMap.get(key);
    if (existing) existing.total += o.total;
    else seriesMap.set(key, { label, total: o.total });
  }

  const salesSeries = [...seriesMap.entries()]
    .map(([date, v]) => ({ date, label: v.label, total: v.total }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const moneyReceived = (paidOrders ?? []).reduce((sum, o) => sum + o.total, 0);
  const pendingPayments = (pendingOrders ?? []).reduce((sum, o) => sum + o.total, 0);
  const refunds = (refundedOrders ?? []).reduce((sum, o) => sum + o.total, 0);

  return {
    kpis: {
      totalSales,
      moneyReceived,
      pendingPayments,
      ordersCount: ordersCount ?? 0,
    },
    salesSeries,
    bucket,
    revenueBreakdown: {
      productSales,
      deliveryCharges,
      discounts,
      refunds,
      netRevenue: totalSales,
    },
    paymentMethods: ALL_PAYMENT_METHODS.map((method) => ({
      method,
      count: byMethod.get(method)?.count ?? 0,
      amount: byMethod.get(method)?.amount ?? 0,
    })),
  };
}

export const FINANCE_ORDERS_PAGE_SIZE = 20;

const FINANCE_ORDER_SELECT =
  "id, order_number, total, shipping_fee, discount, payment_method, payment_status, order_status, created_at, order_items(count)";

export async function getFinanceOrdersPage(
  window: FinanceRangeWindow,
  filters: FinanceOrderFilterState,
  page = 1,
  pageSize = FINANCE_ORDERS_PAGE_SIZE,
): Promise<FinanceOrdersPage> {
  const supabase = await createClient();

  let query = supabase
    .from("orders")
    .select(FINANCE_ORDER_SELECT, { count: "exact" })
    .gte("created_at", window.from.toISOString())
    .lte("created_at", window.to.toISOString());

  if (filters.search.trim()) {
    const term = filters.search.trim().replace(/[%,]/g, "");
    query = query.ilike("order_number", `%${term}%`);
  }
  if (filters.orderStatus) query = query.eq("order_status", filters.orderStatus);
  if (filters.paymentStatus) query = query.eq("payment_status", filters.paymentStatus);
  if (filters.paymentMethod) query = query.eq("payment_method", filters.paymentMethod);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, count, error } = await query.order("created_at", { ascending: false }).range(from, to);
  if (error || !data) return { orders: [], totalCount: 0 };

  // order_items(count) is a raw embedded-resource select string, not
  // represented in the generated Database types -- same pragmatic `any`
  // escape hatch lib/admin/orders-query.ts already uses for the identical
  // shape, rather than fighting the generic Supabase builder types.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = data as any[];

  const orders: FinanceOrderRow[] = rows.map((row) => ({
    id: row.id,
    orderNumber: row.order_number,
    itemSummary: "",
    itemCount: row.order_items?.[0]?.count ?? 0,
    createdAt: row.created_at,
    orderStatus: row.order_status,
    paymentStatus: row.payment_status,
    paymentMethod: row.payment_method,
    total: row.total,
    shippingFee: row.shipping_fee,
    discount: row.discount,
    refund: row.payment_status === "refunded" ? row.total : 0,
  }));

  if (orders.length > 0) await attachItemSummaries(supabase, orders);

  return { orders, totalCount: count ?? 0 };
}

// One batched order_items fetch for the whole page (not N+1) -- only the
// first line per order is needed for the summary text, the rest just
// contribute to itemCount (already fetched via order_items(count) above).
async function attachItemSummaries(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orders: FinanceOrderRow[],
): Promise<void> {
  const { data: itemRows } = await supabase
    .from("order_items")
    .select("order_id, product_name, variant_name, quantity")
    .in(
      "order_id",
      orders.map((o) => o.id),
    )
    .order("created_at", { ascending: true });

  const firstItemByOrderId = new Map<string, { product_name: string; variant_name: string | null; quantity: number }>();
  for (const row of itemRows ?? []) {
    if (!firstItemByOrderId.has(row.order_id)) firstItemByOrderId.set(row.order_id, row);
  }

  for (const order of orders) {
    if (order.itemCount > 1) {
      order.itemSummary = `${order.itemCount} products`;
      continue;
    }
    const first = firstItemByOrderId.get(order.id);
    if (!first) {
      order.itemSummary = "—";
      continue;
    }
    order.itemSummary = first.variant_name
      ? `${first.product_name} (${first.variant_name}) × ${first.quantity}`
      : `${first.product_name} × ${first.quantity}`;
  }
}

const PRODUCT_PERFORMANCE_ROW_LIMIT = 200;

// Units sold + sales per product, from the same frozen order_items.subtotal
// column and the same not-cancelled/returned + date-range rule as every
// other Finance figure -- no cost/profit columns (confirmed in the Phase 0
// audit: no cost field exists anywhere in this schema), omitted entirely
// rather than shown blank. Grouped in JS from a date-bounded fetch, same
// "fetch rows, reduce" idiom as lib/admin/dashboard-query.ts's
// getBestSellers -- falls back to grouping by product_name for any legacy
// row with a null product_id (a deleted product), matching that function's
// existing tolerance for the same case.
export async function getProductPerformance(
  window: FinanceRangeWindow,
  sortBy: "sales" | "units" = "sales",
): Promise<ProductPerformanceRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("order_items")
    .select("product_id, product_name, quantity, subtotal, orders!inner(created_at, order_status)")
    .gte("orders.created_at", window.from.toISOString())
    .lte("orders.created_at", window.to.toISOString())
    .not("orders.order_status", "in", "(cancelled,returned)");
  if (error || !data) return [];

  type Row = { product_id: string | null; product_name: string; quantity: number; subtotal: number };
  const rows = data as unknown as Row[];

  const byKey = new Map<string, ProductPerformanceRow>();
  for (const row of rows) {
    const key = row.product_id ?? `name:${row.product_name}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.unitsSold += row.quantity;
      existing.sales += row.subtotal;
    } else {
      byKey.set(key, {
        productId: row.product_id,
        productName: row.product_name,
        unitsSold: row.quantity,
        sales: row.subtotal,
      });
    }
  }

  const results = [...byKey.values()];
  results.sort((a, b) => (sortBy === "units" ? b.unitsSold - a.unitsSold : b.sales - a.sales));
  return results.slice(0, PRODUCT_PERFORMANCE_ROW_LIMIT);
}
