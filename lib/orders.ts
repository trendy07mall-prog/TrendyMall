"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendOrderConfirmationEmails } from "@/lib/email";
import { isValidSriLankanPhone } from "@/lib/utils";
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
  paymentMethod: Extract<PaymentGateway, "cod" | "bank_transfer">;
  paymentReference: string | null;
  slipPath: string | null;
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
  });

  const row = data?.[0];
  if (error || !row) {
    return { error: error?.message ?? "Could not place order." };
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
