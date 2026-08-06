"use server";

import { requireAdminClient } from "@/lib/admin/guard";
import { renderInvoicePdfBatch } from "@/lib/invoice/InvoicePDF";
import { renderShippingLabelPdfBatch } from "@/lib/invoice/ShippingLabelPDF";
import type { InvoiceProps } from "@/lib/invoice/InvoicePDF";
import type { ShippingLabelProps } from "@/lib/invoice/ShippingLabelPDF";
import type { Order, OrderItem, ShippingAddress } from "@/types";

// Same server-action + client-side Blob shape as lib/admin/orders-export.ts's
// exportOrdersCsvByIds -- one combined PDF instead of the old one-window-per-
// order approach (which most browsers' popup blockers reduced to "only the
// first order prints"). Orders are batch-fetched with .in(), not looped one
// at a time, and the output preserves the caller's selection order since
// .in() itself doesn't guarantee row order.
async function fetchOrdersByIds(
  ids: string[],
): Promise<{ orders: Order[]; itemsByOrderId: Map<string, OrderItem[]>; addressByOrderId: Map<string, ShippingAddress> }> {
  const supabase = await requireAdminClient();
  const [ordersResult, itemsResult, addressesResult] = await Promise.all([
    supabase.from("orders").select("*").in("id", ids),
    supabase.from("order_items").select("*").in("order_id", ids),
    supabase.from("shipping_addresses").select("*").in("order_id", ids),
  ]);

  const itemsByOrderId = new Map<string, OrderItem[]>();
  for (const item of itemsResult.data ?? []) {
    const list = itemsByOrderId.get(item.order_id) ?? [];
    list.push(item);
    itemsByOrderId.set(item.order_id, list);
  }

  const addressByOrderId = new Map<string, ShippingAddress>();
  for (const address of addressesResult.data ?? []) {
    addressByOrderId.set(address.order_id, address);
  }

  return { orders: ordersResult.data ?? [], itemsByOrderId, addressByOrderId };
}

export async function getBulkInvoicePdfBase64(orderIds: string[]): Promise<string> {
  const { orders, itemsByOrderId, addressByOrderId } = await fetchOrdersByIds(orderIds);
  const ordersById = new Map(orders.map((o) => [o.id, o] as const));

  // A mid-selection deletion shouldn't fail the whole print job -- skip any
  // id that no longer resolves to a real order rather than throwing.
  const props: InvoiceProps[] = orderIds
    .map((id) => ordersById.get(id))
    .filter((order): order is Order => order != null)
    .map((order) => ({
      order,
      items: itemsByOrderId.get(order.id) ?? [],
      address: addressByOrderId.get(order.id) ?? null,
    }));

  const buffer = await renderInvoicePdfBatch(props);
  return buffer.toString("base64");
}

export async function getBulkShippingLabelsPdfBase64(orderIds: string[]): Promise<string> {
  const { orders, addressByOrderId } = await fetchOrdersByIds(orderIds);
  const ordersById = new Map(orders.map((o) => [o.id, o] as const));

  const props: ShippingLabelProps[] = orderIds
    .map((id) => ordersById.get(id))
    .filter((order): order is Order => order != null)
    .map((order) => ({
      order,
      address: addressByOrderId.get(order.id) ?? null,
    }));

  const buffer = await renderShippingLabelPdfBatch(props);
  return buffer.toString("base64");
}
