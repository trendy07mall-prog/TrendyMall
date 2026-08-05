import { requireAdminClient } from "@/lib/admin/guard";
import { renderPackingSlipPdf } from "@/lib/invoice/PackingSlipPDF";

// Admin-only (warehouse staff print these to pack the box) — unlike the
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

  const { data: items } = await supabase.from("order_items").select("*").eq("order_id", orderId);

  const pdfBuffer = await renderPackingSlipPdf({ order, items: items ?? [] });

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="packing-slip-${order.order_number}.pdf"`,
    },
  });
}
