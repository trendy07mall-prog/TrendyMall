"use server";

import { requireAdminClient } from "@/lib/admin/guard";
import { PAYMENT_STATUS_LABELS } from "@/components/order/PaymentStatusBadge";
import { ORDER_STATUS_LABELS } from "@/lib/admin/orderStatusFlow";
import { PAYMENT_METHOD_LABELS } from "@/lib/payment-methods";
import type { Order } from "@/types";

// Same server-action + client-side Blob download shape as
// lib/admin/products-export.ts's exportProductsCsvByIds, for consistency
// with the one CSV export already in this codebase — no new route needed.
const HEADER = [
  "order_number", "customer_name", "customer_phone", "payment_method",
  "payment_status", "order_status", "total", "courier", "tracking_number",
  "created_at",
];

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function buildCsv(orders: Order[]): string {
  const rows = orders.map((o) =>
    [
      o.order_number,
      o.customer_name,
      o.customer_phone,
      PAYMENT_METHOD_LABELS[o.payment_method] ?? o.payment_method,
      PAYMENT_STATUS_LABELS[o.payment_status],
      ORDER_STATUS_LABELS[o.order_status],
      String(o.total),
      o.courier ?? "",
      o.tracking_number ?? "",
      o.created_at,
    ]
      .map(csvEscape)
      .join(","),
  );

  return [HEADER.join(","), ...rows].join("\n");
}

export async function exportOrdersCsvByIds(ids: string[]): Promise<string> {
  const supabase = await requireAdminClient();
  const { data } = await supabase.from("orders").select("*").in("id", ids);
  return buildCsv(data ?? []);
}
