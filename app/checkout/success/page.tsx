import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/utils";
import { PaymentStatusBadge } from "@/components/order/PaymentStatusBadge";
import { OrderStatusBadge } from "@/components/order/OrderStatusBadge";
import { OrderSuccessCheck } from "@/components/order/OrderSuccessCheck";
import { PendingPaymentPoller } from "@/components/order/PendingPaymentPoller";
import { CreateAccountPrompt } from "@/components/checkout/CreateAccountPrompt";
import type {
  DeliveryMethod,
  GuestOrderDetail,
  OrderFulfillmentStatus,
  PaymentStatus,
} from "@/types";

interface SuccessViewItem {
  productName: string;
  quantity: number;
  subtotal: number;
  productImageUrl: string | null;
}

interface SuccessView {
  orderNumber: string;
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  orderStatus: OrderFulfillmentStatus;
  deliveryMethod: DeliveryMethod;
  shippingFee: number;
  total: number;
  courier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  isGuest: boolean;
  customerName?: string;
  customerEmail?: string;
  items: SuccessViewItem[];
}

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  const { orderId } = await searchParams;
  if (!orderId) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let view: SuccessView | null = null;

  if (user) {
    const { data: order } = await supabase.from("orders").select("*").eq("id", orderId).maybeSingle();
    if (order) {
      const { data: items } = await supabase.from("order_items").select("*").eq("order_id", orderId);
      view = {
        orderNumber: order.order_number,
        paymentMethod: order.payment_method,
        paymentStatus: order.payment_status,
        orderStatus: order.order_status,
        deliveryMethod: order.delivery_method,
        shippingFee: order.shipping_fee,
        total: order.total,
        courier: order.courier,
        trackingNumber: order.tracking_number,
        trackingUrl: order.tracking_url,
        isGuest: false,
        items: (items ?? []).map((item) => ({
          productName: item.product_name,
          quantity: item.quantity,
          subtotal: item.subtotal,
          productImageUrl: item.product_image_url,
        })),
      };
    }
  } else {
    // A guest has no session, so the normal RLS-scoped select above
    // can't see their own order (auth.uid() is null, orders.user_id is
    // null — not a match under RLS). get_guest_order_by_id (sql/033) is
    // scoped to this exact id and only ever returns a row when the
    // order genuinely has no owner, so it can't be used to view a
    // logged-in customer's order.
    const { data: guestOrderRaw } = await supabase.rpc("get_guest_order_by_id", { p_order_id: orderId });
    const order = guestOrderRaw as GuestOrderDetail | null;
    if (order) {
      view = {
        orderNumber: order.orderNumber,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
        deliveryMethod: order.deliveryMethod,
        shippingFee: order.shippingFee,
        total: order.total,
        courier: order.courier,
        trackingNumber: order.trackingNumber,
        trackingUrl: order.trackingUrl,
        isGuest: true,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        items: order.items.map((item) => ({
          productName: item.productName,
          quantity: item.quantity,
          subtotal: item.subtotal,
          productImageUrl: item.imageUrl,
        })),
      };
    }
  }

  if (!view) notFound();

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-16 text-center">
      <OrderSuccessCheck />
      <h1 className="mt-4 font-heading text-2xl font-bold tracking-tight">
        Thank you — order placed
      </h1>
      {view.paymentMethod === "payhere" && view.paymentStatus === "pending" && <PendingPaymentPoller />}
      <p className="mt-2 text-[var(--muted)]">
        Order <strong>{view.orderNumber}</strong> has been received.
        {view.paymentStatus === "awaiting_verification"
          ? " We'll verify your payment and confirm shortly."
          : view.paymentMethod === "payhere" && view.paymentStatus === "pending"
            ? " We're confirming your card payment — this page will update automatically."
            : view.deliveryMethod === "pickup"
              ? " We'll let you know when it's ready for pickup."
              : " We'll follow up on payment and shipping details shortly."}
      </p>
      <div className="mt-3 flex items-center justify-center gap-2">
        <PaymentStatusBadge status={view.paymentStatus} />
        <OrderStatusBadge status={view.orderStatus} />
      </div>
      <p className="mt-3 text-sm text-[var(--muted)]">
        Save your order number — you can check its status anytime at{" "}
        <Link href="/track-order" className="underline">
          Track Order
        </Link>{" "}
        using this number and the phone or email you used.
      </p>

      {view.isGuest && (
        <CreateAccountPrompt email={view.customerEmail} fullName={view.customerName} />
      )}

      <ul className="mt-8 flex flex-col gap-3 text-left">
        {view.items.map((item, index) => (
          <li
            key={index}
            className="flex items-center gap-3 border-b border-[var(--border)] pb-3 text-sm"
          >
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-black/5">
              {item.productImageUrl && (
                <Image src={item.productImageUrl} alt="" fill sizes="48px" className="object-cover" />
              )}
            </div>
            <div className="flex flex-1 items-center justify-between">
              <span>
                {item.productName} × {item.quantity}
              </span>
              <span>{formatPrice(item.subtotal)}</span>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-col gap-1 text-sm">
        <div className="flex justify-between text-[var(--muted)]">
          <span>Delivery</span>
          <span>
            {view.deliveryMethod === "pickup" ? "Store Pickup" : formatPrice(view.shippingFee)}
          </span>
        </div>
        <div className="flex justify-between font-medium">
          <span>Total</span>
          <span>{formatPrice(view.total)}</span>
        </div>
      </div>

      {(view.courier || view.trackingNumber || view.trackingUrl) && (
        <div className="mt-6 rounded-[var(--radius-md)] border border-[var(--border)] px-4 py-3 text-left text-sm">
          <p className="font-medium">Tracking</p>
          {view.courier && <p className="mt-1 text-[var(--muted)]">Courier: {view.courier}</p>}
          {view.trackingNumber && (
            <p className="text-[var(--muted)]">Tracking number: {view.trackingNumber}</p>
          )}
          {view.trackingUrl && (
            <a href={view.trackingUrl} target="_blank" rel="noopener noreferrer" className="underline">
              Track shipment
            </a>
          )}
        </div>
      )}

      {!view.isGuest && (
        <Link href="/account/orders" className="mt-10 inline-block underline">
          View order history
        </Link>
      )}
    </div>
  );
}
