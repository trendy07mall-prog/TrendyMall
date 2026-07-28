"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendOrderConfirmationEmails } from "@/lib/email";
import { isValidSriLankanPhone } from "@/lib/utils";
import { SITE_URL } from "@/lib/site";
import { isPayHereEnabled, getCheckoutUrl, generateCheckoutHash } from "@/lib/payhere";
import type { DeliveryMethod, PaymentGateway } from "@/types";

export interface CreateOrderInput {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingFirstName: string;
  shippingLastName: string;
  shippingStreet: string;
  shippingCity: string;
  shippingDistrict: string;
  shippingPostalCode: string | null;
  deliveryMethod: DeliveryMethod;
  paymentMethod: PaymentGateway;
  paymentReference: string | null;
  slipPath: string | null;
  couponCode: string | null;
  notes: string | null;
  items: { productId: string; quantity: number }[];
  // The checkout page's own last-rendered total — used only as a
  // staleness check (Rule #1: never trusted as the actual price source).
  // The server/RPC recomputes everything itself regardless of this value.
  clientTotal: number;
}

export interface CreateOrderResult {
  orderId?: string;
  error?: string;
}

// Card/cash data never touches this function or the database — COD and
// Bank Transfer are the only payment methods this app supports so far.
// Pricing, delivery-fee calculation, stock reduction, and the
// order+order_items+shipping_address+payments inserts all happen
// atomically inside the create_order_atomic Postgres function (sql/022)
// — this Server Action only validates input shape and forwards to the
// RPC, it never computes a price itself.
export async function createOrder(
  input: CreateOrderInput,
): Promise<CreateOrderResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "You must be logged in to place an order." };
  if (input.items.length === 0) return { error: "Your cart is empty." };
  if (!input.customerEmail.includes("@")) return { error: "Enter a valid email address." };
  if (!isValidSriLankanPhone(input.customerPhone)) {
    return { error: "Enter a valid Sri Lankan phone number." };
  }
  if (input.deliveryMethod === "standard") {
    if (!input.shippingStreet.trim() || !input.shippingCity.trim() || !input.shippingDistrict.trim()) {
      return { error: "Enter your full shipping address." };
    }
  }
  if (input.paymentMethod === "bank_transfer" && !input.paymentReference?.trim() && !input.slipPath) {
    return { error: "Provide a bank slip or a reference number." };
  }

  const { data, error } = await supabase.rpc("create_order_atomic", {
    p_customer_name: input.customerName,
    p_customer_email: input.customerEmail,
    p_customer_phone: input.customerPhone,
    p_shipping_first_name: input.shippingFirstName,
    p_shipping_last_name: input.shippingLastName,
    p_shipping_street: input.shippingStreet,
    p_shipping_city: input.shippingCity,
    p_shipping_district: input.shippingDistrict,
    p_shipping_postal_code: input.shippingPostalCode,
    p_delivery_method: input.deliveryMethod,
    p_payment_method: input.paymentMethod,
    p_notes: input.notes,
    p_items: input.items.map((item) => ({ product_id: item.productId, quantity: item.quantity })),
    p_client_total: input.clientTotal,
    p_payment_reference: input.paymentReference,
    p_slip_url: input.slipPath,
    p_coupon_code: input.couponCode,
  });

  const row = data?.[0];
  if (error || !row) {
    if (error) {
      // create_order_atomic's own deliberate, customer-facing messages
      // (cart empty, out of stock, price changed, etc.) all use plain
      // `raise exception 'message'`, which Postgres tags with SQLSTATE
      // P0001 — safe to show verbatim. Anything else is an unexpected
      // database error (a bug, a constraint violation, a connectivity
      // blip) and must never reach the customer as raw Postgres text;
      // log it server-side and show a generic, friendly message instead.
      if (error.code === "P0001") {
        return { error: error.message };
      }
      console.error("createOrder: unexpected database error", error);
    }
    return {
      error: "Something went wrong placing your order. Please try again or contact us on WhatsApp.",
    };
  }

  const { data: items } = await supabase
    .from("order_items")
    .select("product_name, quantity, subtotal")
    .eq("order_id", row.order_id);

  const { data: order } = await supabase
    .from("orders")
    .select("shipping_fee, total")
    .eq("id", row.order_id)
    .maybeSingle();

  if (order) {
    await sendOrderConfirmationEmails({
      orderNumber: row.order_number,
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      items: (items ?? []).map((item) => ({
        name: item.product_name,
        quantity: item.quantity,
        subtotal: item.subtotal,
      })),
      shippingFee: order.shipping_fee,
      deliveryMethod: input.deliveryMethod,
      paymentMethod: input.paymentMethod,
      total: order.total,
    });
  }

  revalidatePath("/account/orders");
  return { orderId: row.order_id };
}

export interface PayHereCheckoutParams {
  merchant_id: string;
  return_url: string;
  cancel_url: string;
  notify_url: string;
  order_id: string;
  items: string;
  currency: string;
  amount: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  hash: string;
}

export interface PayHereCheckoutResult {
  checkoutUrl?: string;
  params?: PayHereCheckoutParams;
  error?: string;
}

// Called after createOrder() succeeds for a payhere order — the order
// already exists (stock already reduced, same as COD/bank transfer; see
// the Phase 6 plan for why). Re-fetches the order with the normal
// RLS-scoped client (owner-only, same access pattern as everywhere else)
// and computes the checkout hash server-side; merchant_secret never
// leaves generateCheckoutHash.
export async function getPayHereCheckoutParams(orderId: string): Promise<PayHereCheckoutResult> {
  if (!isPayHereEnabled()) return { error: "Card payment is not available." };

  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) return { error: "Order not found." };
  if (order.payment_method !== "payhere") return { error: "This order isn't a card payment." };

  const [{ data: address }, { data: items }] = await Promise.all([
    supabase.from("shipping_addresses").select("*").eq("order_id", orderId).maybeSingle(),
    supabase.from("order_items").select("product_name, quantity").eq("order_id", orderId),
  ]);

  const itemsSummary =
    (items ?? []).map((item) => `${item.product_name} x${item.quantity}`).join(", ").slice(0, 255) ||
    order.order_number;

  const [fallbackFirstName, ...fallbackRest] = order.customer_name.trim().split(" ");

  return {
    checkoutUrl: getCheckoutUrl(),
    params: {
      merchant_id: process.env.PAYHERE_MERCHANT_ID!,
      return_url: `${SITE_URL}/checkout/success?orderId=${order.id}`,
      cancel_url: `${SITE_URL}/checkout/success?orderId=${order.id}`,
      notify_url: `${SITE_URL}/api/webhooks/payhere`,
      order_id: order.order_number,
      items: itemsSummary,
      currency: "LKR",
      amount: order.total.toFixed(2),
      first_name: address?.first_name ?? fallbackFirstName ?? order.customer_name,
      last_name: address?.last_name ?? fallbackRest.join(" ") ?? "",
      email: order.customer_email,
      phone: order.customer_phone,
      address: address?.street ?? order.shipping_address,
      city: address?.city ?? "Colombo",
      country: "Sri Lanka",
      hash: generateCheckoutHash(order.order_number, order.total),
    },
  };
}
