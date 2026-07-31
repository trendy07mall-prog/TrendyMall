import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { renderInvoicePdf } from "@/lib/invoice/InvoicePDF";
import type { GuestOrderDetail, Order, OrderItem, ShippingAddress } from "@/types";

// @react-pdf/renderer needs Node APIs (reads the logo file from disk) —
// not edge-compatible. 'nodejs' is already the default, set explicitly
// since this route depends on it.
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params;
  const supabase = await createClient();

  // Regular authenticated client, not a service-role bypass — the
  // existing orders_select_own_or_admin RLS policy (auth.uid() = user_id
  // or is_admin()) already enforces "owner or admin" here. A customer
  // requesting someone else's order simply gets zero rows back, which
  // reads below as a plain 404 — never "this order exists but isn't
  // yours."
  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  let invoiceOrder: Order | null = order;
  let items: OrderItem[] | null = null;
  let address: ShippingAddress | null = null;

  if (order) {
    const [itemsResult, addressResult] = await Promise.all([
      supabase.from("order_items").select("*").eq("order_id", orderId),
      supabase.from("shipping_addresses").select("*").eq("order_id", orderId).maybeSingle(),
    ]);
    items = itemsResult.data;
    address = addressResult.data;
  } else {
    // A guest order never matches orders_select_own_or_admin above
    // (user_id is null, and an anonymous caller's auth.uid() is also
    // null — null = null isn't true in SQL) — get_guest_order_by_id
    // (sql/033, security definer, scoped to `user_id is null`) is the
    // authorization *decision*; only once it confirms this exact id is a
    // real guest order does the already-existing admin client (service
    // role, lib/supabase/admin.ts — "only for privileged server-side
    // operations" once authorization is separately decided) fetch the
    // real rows this route needs.
    const { data: guestOrderRaw } = await supabase.rpc("get_guest_order_by_id", { p_order_id: orderId });
    const guestOrder = guestOrderRaw as GuestOrderDetail | null;
    if (!guestOrder) {
      return new Response("Not found", { status: 404 });
    }

    const admin = createAdminClient();
    const [orderResult, itemsResult, addressResult] = await Promise.all([
      admin.from("orders").select("*").eq("id", orderId).maybeSingle(),
      admin.from("order_items").select("*").eq("order_id", orderId),
      admin.from("shipping_addresses").select("*").eq("order_id", orderId).maybeSingle(),
    ]);
    invoiceOrder = orderResult.data;
    items = itemsResult.data;
    address = addressResult.data;
  }

  if (!invoiceOrder) {
    return new Response("Not found", { status: 404 });
  }

  const pdfBuffer = await renderInvoicePdf({
    order: invoiceOrder,
    items: items ?? [],
    address: address ?? null,
  });

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="invoice-${invoiceOrder.order_number}.pdf"`,
    },
  });
}
