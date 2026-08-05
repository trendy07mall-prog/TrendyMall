import { requireAdminClient } from "@/lib/admin/guard";
import { renderShippingLabelPdf } from "@/lib/invoice/ShippingLabelPDF";

// Admin-only (staff print these to affix to packages) — unlike the
// customer-facing invoice route, no guest-order fallback is needed here.
export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params;
  const inline = new URL(request.url).searchParams.get("disposition") === "inline";

  let supabase;
  try {
    supabase = await requireAdminClient();
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  const { data: order } = await supabase.from("orders").select("*").eq("id", orderId).maybeSingle();
  if (!order) return new Response("Not found", { status: 404 });

  const { data: address } = await supabase
    .from("shipping_addresses")
    .select("*")
    .eq("order_id", orderId)
    .maybeSingle();

  const pdfBuffer = await renderShippingLabelPdf({ order, address: address ?? null });

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="shipping-label-${order.order_number}.pdf"`,
    },
  });
}
