import { createClient } from "@/lib/supabase/server";
import { renderInvoicePdf } from "@/lib/invoice/InvoicePDF";

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

  if (!order) {
    return new Response("Not found", { status: 404 });
  }

  const [{ data: items }, { data: address }] = await Promise.all([
    supabase.from("order_items").select("*").eq("order_id", orderId),
    supabase.from("shipping_addresses").select("*").eq("order_id", orderId).maybeSingle(),
  ]);

  const pdfBuffer = await renderInvoicePdf({
    order,
    items: items ?? [],
    address: address ?? null,
  });

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="invoice-${order.order_number}.pdf"`,
    },
  });
}
