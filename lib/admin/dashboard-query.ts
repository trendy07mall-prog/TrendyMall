import { createClient } from "@/lib/supabase/server";
import { getAdminOrderStatusCounts } from "@/lib/admin/orders-query";
import { getRunningCampaignsWithAnalytics, type RunningCampaign } from "@/lib/admin/campaign-analytics";
import { SRI_LANKA_OFFSET_MS } from "@/lib/campaign-datetime";
import type { AdminOrderTab } from "@/lib/admin/orderStatusFlow";

// Plain createClient (not requireAdminClient) -- this is only ever called
// from app/admin/page.tsx, which already sits behind app/admin/layout.tsx's
// own auth/is_admin guard, same convention every other admin *page* data
// fetcher already follows (app/admin/subscribers/page.tsx,
// app/admin/reviews/page.tsx, ...). requireAdminClient is for Server
// Actions specifically, reachable via direct POST outside that layout.

export type DashboardRange = "today" | "7d" | "month" | "custom";

// "Today"/"this month" must mean Sri Lanka wall-clock calendar days, not
// whatever timezone the Node process happens to be running in -- same
// reasoning lib/campaign-datetime.ts's SRI_LANKA_OFFSET_MS already
// documents. Using the server's LOCAL Date getters (.getDate()/.setDate())
// would only be correct by accident on a host whose OS timezone happens to
// match Sri Lanka; shifting by the fixed offset and reading UTC components
// instead makes this correct regardless of deployment environment.
export function sriLankaDateKey(date: Date): string {
  return new Date(date.getTime() + SRI_LANKA_OFFSET_MS).toISOString().slice(0, 10);
}

// Inverse of sriLankaDateKey's day boundary -- the real UTC Date instant
// that is midnight at the start of `date`'s Sri Lanka calendar day, usable
// directly in .gte()/.lt() query bounds.
export function startOfSriLankaDay(date: Date): Date {
  const key = sriLankaDateKey(date);
  return new Date(new Date(`${key}T00:00:00Z`).getTime() - SRI_LANKA_OFFSET_MS);
}

export function startOfSriLankaMonth(date: Date): Date {
  const key = sriLankaDateKey(date); // "YYYY-MM-DD"
  return new Date(new Date(`${key.slice(0, 7)}-01T00:00:00Z`).getTime() - SRI_LANKA_OFFSET_MS);
}

// Same-size "immediately preceding window" comparison for every range --
// generalizes "today vs yesterday" to "this window vs the equal-length
// window right before it," rather than a special case per range.
function resolveRangeWindow(
  range: DashboardRange,
  customFrom?: string,
  customTo?: string,
): { from: Date; to: Date; previousFrom: Date; previousTo: Date } {
  const now = new Date();
  let from: Date;
  let to: Date = now;

  if (range === "custom" && customFrom) {
    // Interpreted as Sri Lanka calendar dates, same convention every other
    // admin date input already uses (sriLankaInputToUtcIso).
    from = new Date(new Date(`${customFrom}T00:00:00Z`).getTime() - SRI_LANKA_OFFSET_MS);
    if (customTo) {
      to = new Date(new Date(`${customTo}T23:59:59.999Z`).getTime() - SRI_LANKA_OFFSET_MS);
    }
  } else if (range === "7d") {
    from = new Date(startOfSriLankaDay(now).getTime() - 6 * 24 * 60 * 60 * 1000);
  } else if (range === "month") {
    from = startOfSriLankaMonth(now);
  } else {
    from = startOfSriLankaDay(now);
  }

  const durationMs = to.getTime() - from.getTime();
  const previousTo = new Date(from.getTime());
  const previousFrom = new Date(from.getTime() - durationMs);
  return { from, to, previousFrom, previousTo };
}

export const DASHBOARD_RANGE_LABELS: Record<DashboardRange, string> = {
  today: "Today",
  "7d": "Last 7 Days",
  month: "This Month",
  custom: "Custom Range",
};

export interface SalesSeriesPoint {
  date: string; // "YYYY-MM-DD"
  total: number;
}

export interface RecentOrderRow {
  id: string;
  orderNumber: string;
  customerName: string;
  total: number;
  paymentStatus: string;
  orderStatus: string;
  createdAt: string;
  itemCount: number;
}

export interface RecentReviewRow {
  id: string;
  productName: string;
  reviewerName: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  isNew: boolean; // created within the last 48h -- a display convention off
  // the real created_at, not a tracked read/unread flag (none exists).
}

export interface NewSubscriberRow {
  id: string;
  email: string;
  createdAt: string;
}

export interface BestSellerRow {
  productId: string | null;
  name: string;
  quantity: number;
  image: string | null;
}

export interface LowStockRow {
  id: string;
  name: string;
  stock: number;
}

export interface DashboardData {
  range: DashboardRange;
  rangeLabel: string;
  rangeFrom: string;
  rangeTo: string;

  periodSales: number;
  periodSalesChangePercent: number | null; // null when the previous window had 0 (no % is defined)
  periodOrdersCount: number;
  newCustomersCount: number;
  pendingPaymentsTotal: number;
  newOrdersCount: number; // order_status = 'pending' right now -- for the bell

  chartRangeDays: 7 | 30 | 90;
  salesSeries: SalesSeriesPoint[];

  runningCampaigns: RunningCampaign[];

  orderStatusCounts: Record<AdminOrderTab, number>;
  recentOrders: RecentOrderRow[];

  revenue: number;
  paidTotal: number;
  refundsTotal: number;
  gross: number;
  discounts: number;
  delivery: number;
  net: number;

  recentReviews: RecentReviewRow[];
  newSubscribers: NewSubscriberRow[];

  bestSellers: BestSellerRow[];

  productCount: number;
  lowStockProducts: LowStockRow[];
}

const NOT_CANCELLED_RETURNED = "(cancelled,returned)";
const RECENT_REVIEW_WINDOW_MS = 48 * 60 * 60 * 1000;

export async function getDashboardData(
  range: DashboardRange,
  chartRangeDays: 7 | 30 | 90 = 7,
  customFrom?: string,
  customTo?: string,
): Promise<DashboardData> {
  const supabase = await createClient();
  const { from, to, previousFrom, previousTo } = resolveRangeWindow(range, customFrom, customTo);

  const chartFrom = new Date(
    startOfSriLankaDay(new Date()).getTime() - (chartRangeDays - 1) * 24 * 60 * 60 * 1000,
  );

  const [
    { data: periodOrders },
    { data: previousPeriodOrders },
    { count: periodOrdersCount },
    { count: newCustomersCount },
    { data: pendingOrders },
    { count: newOrdersCount },
    { data: chartOrders },
    runningCampaigns,
    orderStatusCounts,
    { data: recentOrdersRaw },
    { data: allRevenueOrders },
    { data: paidOrders },
    { data: refundedOrders },
    { data: reviewsRaw },
    { data: subscribersRaw },
    { data: orderItemsRaw },
    { count: productCount },
    { data: lowStockRaw },
  ] = await Promise.all([
    supabase
      .from("orders")
      .select("total")
      .gte("created_at", from.toISOString())
      .lte("created_at", to.toISOString())
      .not("order_status", "in", NOT_CANCELLED_RETURNED),
    supabase
      .from("orders")
      .select("total")
      .gte("created_at", previousFrom.toISOString())
      .lt("created_at", previousTo.toISOString())
      .not("order_status", "in", NOT_CANCELLED_RETURNED),
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .gte("created_at", from.toISOString())
      .lte("created_at", to.toISOString()),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("is_admin", false)
      .gte("created_at", from.toISOString())
      .lte("created_at", to.toISOString()),
    supabase
      .from("orders")
      .select("total")
      .in("payment_status", ["pending", "awaiting_verification"]),
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("order_status", "pending"),
    supabase
      .from("orders")
      .select("total, created_at")
      .gte("created_at", chartFrom.toISOString())
      .not("order_status", "in", NOT_CANCELLED_RETURNED),
    getRunningCampaignsWithAnalytics(supabase),
    getAdminOrderStatusCounts(),
    supabase
      .from("orders")
      .select("id, order_number, customer_name, total, payment_status, order_status, created_at, order_items(count)")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.from("orders").select("total").not("order_status", "in", NOT_CANCELLED_RETURNED),
    supabase.from("orders").select("total").eq("payment_status", "paid"),
    supabase.from("orders").select("total").eq("payment_status", "refunded"),
    supabase.from("reviews").select("*").order("created_at", { ascending: false }).limit(3),
    supabase.from("subscribers").select("*").order("created_at", { ascending: false }).limit(5),
    supabase.from("order_items").select("product_id, product_name, quantity"),
    supabase.from("products").select("*", { count: "exact", head: true }).eq("is_deleted", false),
    supabase
      .from("products")
      .select("id, name, stock")
      .eq("is_deleted", false)
      .lt("stock", 5)
      .order("stock", { ascending: true }),
  ]);

  const periodSales = (periodOrders ?? []).reduce((sum, o) => sum + o.total, 0);
  const previousPeriodSales = (previousPeriodOrders ?? []).reduce((sum, o) => sum + o.total, 0);
  const periodSalesChangePercent =
    previousPeriodSales > 0 ? ((periodSales - previousPeriodSales) / previousPeriodSales) * 100 : null;

  const pendingPaymentsTotal = (pendingOrders ?? []).reduce((sum, o) => sum + o.total, 0);

  // Day-bucketed in JS from a flat select, same "fetch rows, reduce" idiom
  // every other figure on this page already uses -- no group-by query.
  // Bucketed by Sri Lanka calendar day (sriLankaDateKey), not a raw UTC
  // slice of created_at, for the same reason startOfSriLankaDay exists.
  const byDay = new Map<string, number>();
  for (const order of chartOrders ?? []) {
    const day = sriLankaDateKey(new Date(order.created_at));
    byDay.set(day, (byDay.get(day) ?? 0) + order.total);
  }
  const salesSeries: SalesSeriesPoint[] = [];
  for (let i = 0; i < chartRangeDays; i++) {
    const key = sriLankaDateKey(new Date(chartFrom.getTime() + i * 24 * 60 * 60 * 1000));
    salesSeries.push({ date: key, total: byDay.get(key) ?? 0 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recentOrderRows = (recentOrdersRaw ?? []) as any[];
  const recentOrders: RecentOrderRow[] = recentOrderRows.map((row) => ({
    id: row.id,
    orderNumber: row.order_number,
    customerName: row.customer_name,
    total: row.total,
    paymentStatus: row.payment_status,
    orderStatus: row.order_status,
    createdAt: row.created_at,
    itemCount: row.order_items?.[0]?.count ?? 0,
  }));

  const revenue = (allRevenueOrders ?? []).reduce((sum, o) => sum + o.total, 0);
  const paidTotal = (paidOrders ?? []).reduce((sum, o) => sum + o.total, 0);
  const refundsTotal = (refundedOrders ?? []).reduce((sum, o) => sum + o.total, 0);

  const { gross, discounts, delivery, net } = await getFinanceBreakdown(supabase);

  const reviews = reviewsRaw ?? [];
  const reviewProductIds = [...new Set(reviews.map((r) => r.product_id))];
  const reviewUserIds = [...new Set(reviews.map((r) => r.user_id))];
  const [{ data: reviewProducts }, { data: reviewers }] = await Promise.all([
    reviewProductIds.length > 0
      ? supabase.from("products").select("id, name").in("id", reviewProductIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    reviewUserIds.length > 0
      ? supabase.from("profiles").select("id, full_name").in("id", reviewUserIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
  ]);
  const productNameById = new Map((reviewProducts ?? []).map((p) => [p.id, p.name] as const));
  const reviewerNameById = new Map((reviewers ?? []).map((p) => [p.id, p.full_name ?? "—"] as const));
  const now = Date.now();
  const recentReviews: RecentReviewRow[] = reviews.map((r) => ({
    id: r.id,
    productName: productNameById.get(r.product_id) ?? "Unknown product",
    reviewerName: reviewerNameById.get(r.user_id) ?? "Unknown customer",
    rating: r.rating,
    comment: r.comment,
    createdAt: r.created_at,
    isNew: now - new Date(r.created_at).getTime() < RECENT_REVIEW_WINDOW_MS,
  }));

  const newSubscribers: NewSubscriberRow[] = (subscribersRaw ?? []).map((s) => ({
    id: s.id,
    email: s.email,
    createdAt: s.created_at,
  }));

  const bestSellers = await getBestSellers(supabase, orderItemsRaw ?? []);

  return {
    range,
    rangeLabel: DASHBOARD_RANGE_LABELS[range],
    rangeFrom: from.toISOString(),
    rangeTo: to.toISOString(),

    periodSales,
    periodSalesChangePercent,
    periodOrdersCount: periodOrdersCount ?? 0,
    newCustomersCount: newCustomersCount ?? 0,
    pendingPaymentsTotal,
    newOrdersCount: newOrdersCount ?? 0,

    chartRangeDays,
    salesSeries,

    runningCampaigns,

    orderStatusCounts,
    recentOrders,

    revenue,
    paidTotal,
    refundsTotal,
    gross,
    discounts,
    delivery,
    net,

    recentReviews,
    newSubscribers,

    bestSellers,

    productCount: productCount ?? 0,
    lowStockProducts: (lowStockRaw ?? []) as LowStockRow[],
  };
}

// subtotal/discount/shipping_fee/total are confirmed non-null and
// check-constrained consistent for every order (sql/026_coupons.sql) --
// all-time, matching the existing Revenue tile's own all-time scope, not
// the period selector (Finance is "current state," same as Pending
// Payments, not a trend).
async function getFinanceBreakdown(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<{ gross: number; discounts: number; delivery: number; net: number }> {
  const { data } = await supabase
    .from("orders")
    .select("subtotal, discount, shipping_fee, total")
    .not("order_status", "in", NOT_CANCELLED_RETURNED);

  let gross = 0;
  let discounts = 0;
  let delivery = 0;
  let net = 0;
  for (const o of data ?? []) {
    gross += o.subtotal;
    discounts += o.discount;
    delivery += o.shipping_fee;
    net += o.total;
  }
  return { gross, discounts, delivery, net };
}

// Same ranking calculation as before (sum quantity per product, top 5) --
// only extended to also carry product_id (already on order_items, just
// not previously selected) so real images can be looked up, rather than
// showing name-only rows. Falls back to grouping by name for any legacy
// row with a null product_id (a deleted product), matching how this list
// already tolerated that silently before.
async function getBestSellers(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orderItems: { product_id: string | null; product_name: string; quantity: number }[],
): Promise<BestSellerRow[]> {
  const salesByKey = new Map<string, { productId: string | null; name: string; quantity: number }>();
  for (const item of orderItems) {
    const key = item.product_id ?? `name:${item.product_name}`;
    const existing = salesByKey.get(key);
    if (existing) existing.quantity += item.quantity;
    else salesByKey.set(key, { productId: item.product_id, name: item.product_name, quantity: item.quantity });
  }
  const top = [...salesByKey.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 5);

  const productIds = top.map((t) => t.productId).filter((id): id is string => id != null);
  const imageByProductId = new Map<string, string>();
  if (productIds.length > 0) {
    const { data: images } = await supabase
      .from("product_images")
      .select("product_id, image_url, sort_order")
      .in("product_id", productIds)
      .order("sort_order", { ascending: true });
    for (const img of images ?? []) {
      if (!imageByProductId.has(img.product_id)) imageByProductId.set(img.product_id, img.image_url);
    }
  }

  return top.map((t) => ({
    productId: t.productId,
    name: t.name,
    quantity: t.quantity,
    image: t.productId ? (imageByProductId.get(t.productId) ?? null) : null,
  }));
}
