"use server";

import { requireAdminClient } from "@/lib/admin/guard";
import { ORDER_STATUS_LABELS } from "@/lib/admin/orderStatusFlow";
import { PAYMENT_STATUS_LABELS } from "@/components/order/PaymentStatusBadge";
import { PAYMENT_METHOD_LABELS } from "@/lib/payment-methods";
import { resolveFinanceRangeWindow, type FinanceRange } from "@/lib/admin/finance-query";
import type { FinanceOrderFilterState } from "@/lib/admin/finance-filters";
import type { OrderFulfillmentStatus, PaymentStatus } from "@/types";

// Same server-action + client-side Blob download shape as
// lib/admin/orders-export.ts -- no new pattern introduced. Deliberately
// narrower than that export: Finance's own Orders table never shows a
// customer name/phone column (see FinanceOrdersTable), so this CSV doesn't
// include any either -- no more customer PII than what the UI itself shows.
const HEADER = [
  "order_number",
  "order_date",
  "order_status",
  "payment_status",
  "payment_method",
  "order_amount",
  "delivery_charge",
  "discount",
  "refund",
];

// Real, but generous, cap -- protects against an unbounded export on a
// multi-year "This Year" range while comfortably covering this store's
// actual order volume. Not a silent truncation: if ever hit, the caller can
// narrow the date range or filters to get the rest.
const EXPORT_ROW_LIMIT = 10000;

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export async function exportFinanceOrdersCsv(
  range: FinanceRange,
  customFrom: string,
  customTo: string,
  filters: FinanceOrderFilterState,
): Promise<string> {
  const supabase = await requireAdminClient();
  const window = resolveFinanceRangeWindow(range, customFrom, customTo);

  let query = supabase
    .from("orders")
    .select("order_number, created_at, order_status, payment_status, payment_method, total, shipping_fee, discount")
    .gte("created_at", window.from.toISOString())
    .lte("created_at", window.to.toISOString());

  if (filters.search.trim()) {
    const term = filters.search.trim().replace(/[%,]/g, "");
    query = query.ilike("order_number", `%${term}%`);
  }
  if (filters.orderStatus) query = query.eq("order_status", filters.orderStatus);
  if (filters.paymentStatus) query = query.eq("payment_status", filters.paymentStatus);
  if (filters.paymentMethod) query = query.eq("payment_method", filters.paymentMethod);

  const { data } = await query.order("created_at", { ascending: false }).limit(EXPORT_ROW_LIMIT);

  const rows = (data ?? []).map((o) =>
    [
      o.order_number,
      o.created_at,
      ORDER_STATUS_LABELS[o.order_status as OrderFulfillmentStatus] ?? o.order_status,
      PAYMENT_STATUS_LABELS[o.payment_status as PaymentStatus] ?? o.payment_status,
      PAYMENT_METHOD_LABELS[o.payment_method] ?? o.payment_method,
      String(o.total),
      String(o.shipping_fee),
      String(o.discount),
      String(o.payment_status === "refunded" ? o.total : 0),
    ]
      .map(csvEscape)
      .join(","),
  );

  return [HEADER.join(","), ...rows].join("\n");
}
