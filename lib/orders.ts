"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendOrderConfirmationEmails } from "@/lib/email";
import { isValidSriLankanPhone } from "@/lib/utils";
import { SITE_URL } from "@/lib/site";
import { isPayHereEnabled, getCheckoutUrl, generateCheckoutHash } from "@/lib/payhere";
import type { DeliveryMethod, GuestOrderDetail, PaymentGateway } from "@/types";

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
  // Traceability only (decision #1, v12) — which saved customer_addresses
  // row (if any) this shipment came from. Never authoritative: the RPC
  // always snapshots the actual submitted fields into shipping_addresses
  // regardless of this value.
  sourceAddressId: string | null;
  // Generated once client-side per checkout attempt and persisted across
  // a page reload (CheckoutForm.tsx) — lets create_order_atomic treat a
  // retried submission (lost response, reload mid-request) as a safe
  // replay that returns the existing order instead of creating a
  // duplicate or double-reducing stock.
  idempotencyKey: string;
  items: { productId: string; quantity: number }[];
  // The checkout page's own last-rendered total — used only as a
  // staleness check (Rule #1: never trusted as the actual price source).
  // The server/RPC recomputes everything itself regardless of this value.
  clientTotal: number;
  // The checkout page's own computed delivery fee (lib/delivery-fee.ts)
  // — never used to set the charged amount (the RPC always recomputes
  // its own fee from the submitted address and ignores this), only
  // compared server-side so a disagreement gets logged instead of
  // silently passing unnoticed.
  clientShippingFee: number;
}

export interface CreateOrderResult {
  orderId?: string;
  orderNumber?: string;
  error?: string;
}

// A short, greppable, customer-quotable id for an unexpected order-creation
// failure — paired with a full server-side log line and an
// order_error_log row (sql/036) carrying the same code, so "the customer
// says it's broken" turns into a direct lookup instead of guesswork.
function generateErrorReferenceCode(): string {
  const time = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ERR-${time}-${rand}`;
}

// Card/cash data never touches this function or the database — COD and
// Bank Transfer are the only payment methods this app supports so far.
// Pricing, delivery-fee calculation, stock reduction, and the
// order+order_items+shipping_address+payments inserts all happen
// atomically inside the create_order_atomic Postgres function (sql/022)
// — this Server Action only validates input shape and forwards to the
// RPC, it never computes a price itself.
//
// `user` is optional — guest checkout (v12 Phase 4). A guest's own order
// still can't be read back through the normal RLS-scoped client (RLS is
// `auth.uid() = user_id`, and both sides are null for a guest, which
// isn't a match) — the get_guest_order_by_id branches below exist for
// exactly that reason, not as an oversight.
export async function createOrder(
  input: CreateOrderInput,
): Promise<CreateOrderResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
    p_source_address_id: input.sourceAddressId,
    p_idempotency_key: input.idempotencyKey,
    p_client_shipping_fee: input.clientShippingFee,
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

      // A short code the customer can quote, so "it's broken" turns into
      // "look up ERR-XYZ" instead of needing screen-recordings or DevTools.
      const referenceCode = generateErrorReferenceCode();

      // Deliberately logged as separate fields, not just the error object
      // — Postgres's detail/hint often carry the actual root cause (e.g.
      // "column reference X is ambiguous" errors put the ambiguous column
      // in `message` but the candidate matches in `detail`), and some log
      // pipelines flatten/truncate a nested object differently than
      // top-level fields.
      console.error(`createOrder: unexpected database error [${referenceCode}]`, {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });

      // Best-effort, mirrored into a table (not just console) so it's
      // checkable on /admin/debug without Vercel log access. No customer
      // PII beyond what's already non-sensitive/aggregate — never the
      // email/phone/address that were being submitted.
      const { error: logError } = await supabase.from("order_error_log").insert({
        reference_code: referenceCode,
        error_code: error.code,
        error_message: error.message,
        error_detail: error.details,
        error_hint: error.hint,
        context: {
          paymentMethod: input.paymentMethod,
          deliveryMethod: input.deliveryMethod,
          itemCount: input.items.length,
          hasCoupon: Boolean(input.couponCode),
          loggedIn: Boolean(user),
        },
      });
      if (logError) {
        console.error(`createOrder: failed to write order_error_log for [${referenceCode}]`, logError);
      }

      return {
        error: `Something went wrong placing your order. Please try again or message us on WhatsApp — reference: ${referenceCode}`,
      };
    }
    return {
      error: "Something went wrong placing your order. Please try again or contact us on WhatsApp.",
    };
  }

  // Everything below is a side effect of an order that already, definitely,
  // exists (the RPC above returned successfully) — email sending, the
  // preferred-payment-method write-back, cache revalidation. None of it may
  // ever prevent createOrder() from returning a success result: if the
  // Server Action itself threw here, the client's `await createOrder(...)`
  // would reject, and — since CheckoutForm.tsx's handleSubmit has no
  // matching try/catch of its own around that call — the customer would be
  // left on a stuck, pending checkout page with no visible error, despite
  // the order having already saved. This is exactly the bug this try/catch
  // closes off.
  try {
    if (user) {
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
          shippingDistrict: input.shippingDistrict,
          shippingPostalCode: input.shippingPostalCode,
          deliveryMethod: input.deliveryMethod,
          paymentMethod: input.paymentMethod,
          total: order.total,
        });
      }

      // Best-effort — "remembers last-used method" (Phase 1's Payment
      // Preference field) is a convenience, never worth failing an
      // already-placed order over.
      await supabase.from("profiles").update({ preferred_payment_method: input.paymentMethod }).eq("id", user.id);

      revalidatePath("/account/orders");
      revalidatePath("/account/preferences");
    } else {
      const { data: guestOrderRaw } = await supabase.rpc("get_guest_order_by_id", {
        p_order_id: row.order_id,
      });
      const guestOrder = guestOrderRaw as GuestOrderDetail | null;
      if (guestOrder) {
        await sendOrderConfirmationEmails({
          orderNumber: row.order_number,
          customerName: input.customerName,
          customerEmail: input.customerEmail,
          items: guestOrder.items.map((item) => ({
            name: item.productName,
            quantity: item.quantity,
            subtotal: item.subtotal,
          })),
          shippingFee: guestOrder.shippingFee,
          shippingDistrict: input.shippingDistrict,
          shippingPostalCode: input.shippingPostalCode,
          deliveryMethod: input.deliveryMethod,
          paymentMethod: input.paymentMethod,
          total: guestOrder.total,
        });
      }
    }
  } catch (sideEffectError) {
    console.error("createOrder: post-creation side effect failed (order itself already saved)", sideEffectError);
  }

  return { orderId: row.order_id, orderNumber: row.order_number };
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
// the Phase 6 plan for why). Re-fetches the order and computes the
// checkout hash server-side; merchant_secret never leaves
// generateCheckoutHash. Branches on session the same way createOrder does
// — a guest's order can't be read via the normal RLS-scoped client.
export async function getPayHereCheckoutParams(orderId: string): Promise<PayHereCheckoutResult> {
  if (!isPayHereEnabled()) return { error: "Card payment is not available." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const { data: guestOrderRaw } = await supabase.rpc("get_guest_order_by_id", { p_order_id: orderId });
    const order = guestOrderRaw as GuestOrderDetail | null;
    if (!order || !order.orderId) return { error: "Order not found." };
    if (order.paymentMethod !== "payhere") return { error: "This order isn't a card payment." };

    const itemsSummary =
      order.items.map((item) => `${item.productName} x${item.quantity}`).join(", ").slice(0, 255) ||
      order.orderNumber;
    const [fallbackFirstName, ...fallbackRest] = (order.customerName ?? "").trim().split(" ");

    return {
      checkoutUrl: getCheckoutUrl(),
      params: {
        merchant_id: process.env.PAYHERE_MERCHANT_ID!,
        return_url: `${SITE_URL}/order-confirmation/${order.orderNumber}?t=${order.orderId}`,
        cancel_url: `${SITE_URL}/order-confirmation/${order.orderNumber}?t=${order.orderId}`,
        notify_url: `${SITE_URL}/api/webhooks/payhere`,
        order_id: order.orderNumber,
        items: itemsSummary,
        currency: "LKR",
        amount: order.total.toFixed(2),
        first_name: fallbackFirstName || order.customerName || "",
        last_name: fallbackRest.join(" "),
        email: order.customerEmail ?? "",
        phone: order.customerPhone ?? "",
        address: order.shippingAddressDetail?.street ?? order.shippingAddress,
        city: order.shippingAddressDetail?.city ?? "Colombo",
        country: "Sri Lanka",
        hash: generateCheckoutHash(order.orderNumber, order.total),
      },
    };
  }

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
      return_url: `${SITE_URL}/order-confirmation/${order.order_number}`,
      cancel_url: `${SITE_URL}/order-confirmation/${order.order_number}`,
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
