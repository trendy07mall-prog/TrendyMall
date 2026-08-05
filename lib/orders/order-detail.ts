import { createClient } from "@/lib/supabase/server";
import type { AttributeSelection, GuestOrderDetail } from "@/types";

// Assembles the exact same GuestOrderDetail shape get_order_confirmation/
// track_order/get_guest_order_by_id already produce, from plain RLS-scoped
// queries instead of a security-definer RPC — a *read* needs no bypass at
// all here (orders_select_own_or_admin, order_items_select_own_or_admin,
// shipping_addresses_select_own_or_admin, payments_select_own_or_admin,
// order_status_history_select_own_or_admin already scope every table
// involved to the caller's own rows), so every shared component
// (OrderStatusBadges, OrderTimeline, OrderSummaryCard, DeliveryAddressCard)
// drops in with zero adaptation. Returns null if the order doesn't exist
// or doesn't belong to the caller — RLS makes every query below come back
// empty in that case, not an error.
export async function getMyOrderDetail(orderId: string): Promise<GuestOrderDetail | null> {
  const supabase = await createClient();

  const { data: order } = await supabase.from("orders").select("*").eq("id", orderId).maybeSingle();
  if (!order) return null;

  const [{ data: items }, { data: address }, { data: payment }, { data: history }] = await Promise.all([
    supabase.from("order_items").select("*").eq("order_id", orderId).order("created_at", { ascending: true }),
    supabase.from("shipping_addresses").select("*").eq("order_id", orderId).maybeSingle(),
    supabase.from("payments").select("reference_number").eq("order_id", orderId).maybeSingle(),
    supabase
      .from("order_status_history")
      .select("new_value, note, created_at")
      .eq("order_id", orderId)
      .eq("field", "order_status")
      .order("created_at", { ascending: true }),
  ]);

  return {
    orderId: order.id,
    isGuest: order.user_id === null,
    orderNumber: order.order_number,
    customerName: order.customer_name,
    customerEmail: order.customer_email,
    customerPhone: order.customer_phone,
    paymentStatus: order.payment_status,
    orderStatus: order.order_status,
    paymentMethod: order.payment_method,
    paymentReference: payment?.reference_number ?? null,
    deliveryMethod: order.delivery_method,
    deliveryAttemptCount: order.delivery_attempt_count,
    failureReason: order.delivery_failure_reason,
    subtotal: order.subtotal,
    shippingFee: order.shipping_fee,
    discount: order.discount,
    total: order.total,
    notes: order.notes,
    courier: order.courier,
    trackingNumber: order.tracking_number,
    trackingUrl: order.tracking_url,
    createdAt: order.created_at,
    shippingAddress: order.shipping_address,
    shippingAddressDetail: address
      ? {
          street: address.street,
          city: address.city,
          district: address.district,
          postalCode: address.postal_code,
        }
      : null,
    items: (items ?? []).map((item) => ({
      productId: item.product_id ?? undefined,
      productName: item.product_name,
      quantity: item.quantity,
      subtotal: item.subtotal,
      imageUrl: item.product_image_url,
      variantName: item.variant_name,
      variantColorHex: item.variant_color_hex,
      attributeSelections: item.attribute_selections as AttributeSelection[] | null,
    })),
    statusHistory: (history ?? []).map((entry) => ({
      status: entry.new_value as GuestOrderDetail["orderStatus"],
      changedAt: entry.created_at,
      note: entry.note,
    })),
  };
}
