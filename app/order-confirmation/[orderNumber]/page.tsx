import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/utils";
import { describeDeliveryFee } from "@/lib/delivery-fee";
import { PaymentStatusBadge } from "@/components/order/PaymentStatusBadge";
import { OrderStatusBadge } from "@/components/order/OrderStatusBadge";
import { OrderSuccessCheck } from "@/components/order/OrderSuccessCheck";
import { PendingPaymentPoller } from "@/components/order/PendingPaymentPoller";
import { CreateAccountPrompt } from "@/components/checkout/CreateAccountPrompt";
import type { GuestOrderDetail } from "@/types";

// Replaces /checkout/success?orderId=. Keyed by order NUMBER (human,
// bookmarkable, refresh-safe) rather than the raw UUID — access control
// lives entirely in the get_order_confirmation RPC (sql/037): a logged-in
// customer is authorized by RLS-equivalent ownership inside that
// function, a guest must additionally present the `t` token (the order's
// own id — unguessable, same reasoning as get_guest_order_by_id). Neither
// path can be used to view a different customer's order by only changing
// the order number in the URL.
export default async function OrderConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { orderNumber } = await params;
  const { t: token } = await searchParams;

  const supabase = await createClient();
  const { data: orderRaw } = await supabase.rpc("get_order_confirmation", {
    p_order_number: orderNumber,
    p_token: token ?? null,
  });
  const order = orderRaw as GuestOrderDetail | null;

  if (!order) notFound();

  const deliveryReason = order.shippingAddressDetail
    ? describeDeliveryFee({
        district: order.shippingAddressDetail.district,
        postalCode: order.shippingAddressDetail.postalCode,
        deliveryMethod: order.deliveryMethod,
      }).reason
    : null;

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-16 text-center">
      <OrderSuccessCheck />
      <h1 className="mt-4 font-heading text-2xl font-bold tracking-tight">
        Thank you — order placed
      </h1>
      {order.paymentMethod === "payhere" && order.paymentStatus === "pending" && <PendingPaymentPoller />}
      <p className="mt-2 text-[var(--muted)]">
        Order <strong>{order.orderNumber}</strong> has been received.
        {order.paymentStatus === "awaiting_verification"
          ? " We'll verify your payment and confirm shortly."
          : order.paymentMethod === "payhere" && order.paymentStatus === "pending"
            ? " We're confirming your card payment — this page will update automatically."
            : order.deliveryMethod === "pickup"
              ? " We'll let you know when it's ready for pickup."
              : " We'll follow up on payment and shipping details shortly."}
      </p>
      <div className="mt-3 flex items-center justify-center gap-2">
        <PaymentStatusBadge status={order.paymentStatus} />
        <OrderStatusBadge status={order.orderStatus} />
      </div>
      <p className="mt-3 text-sm text-[var(--muted)]">
        Save your order number — you can check its status anytime at{" "}
        <Link href="/track-order" className="underline">
          Track Order
        </Link>{" "}
        using this number and the phone or email you used.
      </p>

      {order.isGuest && (
        <CreateAccountPrompt email={order.customerEmail} fullName={order.customerName} />
      )}

      <ul className="mt-8 flex flex-col gap-3 text-left">
        {order.items.map((item, index) => (
          <li
            key={index}
            className="flex items-center gap-3 border-b border-[var(--border)] pb-3 text-sm"
          >
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-black/5">
              {item.imageUrl && (
                <Image src={item.imageUrl} alt="" fill sizes="48px" className="object-cover" />
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
          <span>
            Delivery
            {deliveryReason && order.deliveryMethod !== "pickup" && (
              <span className="block text-xs">{deliveryReason}</span>
            )}
          </span>
          <span>
            {order.deliveryMethod === "pickup" ? "Store Pickup" : formatPrice(order.shippingFee)}
          </span>
        </div>
        <div className="flex justify-between font-medium">
          <span>Total</span>
          <span>{formatPrice(order.total)}</span>
        </div>
      </div>

      {(order.courier || order.trackingNumber || order.trackingUrl) && (
        <div className="mt-6 rounded-[var(--radius-md)] border border-[var(--border)] px-4 py-3 text-left text-sm">
          <p className="font-medium">Tracking</p>
          {order.courier && <p className="mt-1 text-[var(--muted)]">Courier: {order.courier}</p>}
          {order.trackingNumber && (
            <p className="text-[var(--muted)]">Tracking number: {order.trackingNumber}</p>
          )}
          {order.trackingUrl && (
            <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="underline">
              Track shipment
            </a>
          )}
        </div>
      )}

      {!order.isGuest && (
        <Link href="/account/orders" className="mt-10 inline-block underline">
          View order history
        </Link>
      )}
    </div>
  );
}
