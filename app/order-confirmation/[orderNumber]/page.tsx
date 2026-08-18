import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBankTransferSettings } from "@/lib/bankTransferSettings";
import { getCartRecommendations } from "@/lib/cart-recommendations";
import { getEstimatedDeliveryRange } from "@/lib/delivery";
import { isColomboZoneAddress } from "@/lib/delivery-fee";
import { getWhatsAppUrl } from "@/lib/site";
import { getGeneralSettings, getShippingSettings } from "@/lib/data/settings";
import { getActiveDeliveryZones } from "@/lib/data/delivery-zones";
import { OrderSuccessCheck } from "@/components/order/OrderSuccessCheck";
import { PurchaseTracker } from "@/components/order/PurchaseTracker";
import { OrderStatusSection } from "@/components/order/OrderStatusSection";
import { OrderSummaryCard } from "@/components/order/OrderSummaryCard";
import { DeliveryAddressCard } from "@/components/order/DeliveryAddressCard";
import { CopyOrderNumber } from "@/components/order/CopyOrderNumber";
import { formatStepDate } from "@/components/order/OrderTimeline";
import { CreateAccountPrompt } from "@/components/checkout/CreateAccountPrompt";
import { RelatedProducts } from "@/components/product/RelatedProducts";
import { TruckIcon, ShoppingBagIcon, WhatsAppIcon } from "@/components/ui/Icon";
import type { GuestOrderDetail, OrderFulfillmentStatus } from "@/types";

// This page is reached at every stage of an order's life, not just right
// after checkout — a delivered or cancelled order must never still say
// "Thank you — order placed" (the bug this whole page was rebuilt to
// close off).
const CONFIRMATION_HEADINGS: Record<OrderFulfillmentStatus, string> = {
  pending: "Thank you — order placed",
  confirmed: "Thank you — order placed",
  packing: "Your order is being packed",
  shipped: "Your order has shipped",
  out_for_delivery: "Your order is out for delivery",
  delivered: "Order delivered",
  failed_delivery: "Delivery attempt failed",
  cancelled: "Order cancelled",
  returned: "Order returned",
};

const TERMINAL_STATUSES: OrderFulfillmentStatus[] = ["delivered", "cancelled", "returned", "failed_delivery"];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}): Promise<Metadata> {
  const { orderNumber } = await params;
  return {
    title: `Order ${orderNumber}`,
    description: "Your TrendyMall order confirmation.",
    // Order pages carry a customer's personal details and must never
    // surface in search results — no existing noindex convention exists
    // elsewhere in this app to match, this introduces it.
    robots: { index: false, follow: false },
  };
}

function whatsNextSteps(
  order: GuestOrderDetail,
  pickupAddress: string,
  pickupHours: string,
): string[] | null {
  // Once the order is delivered/cancelled/returned/failed there's no
  // "next" to describe — the timeline's own failed-delivery panel
  // already explains that last one — so the whole section hides rather
  // than showing a stale, forward-looking step list for a finished order.
  if (TERMINAL_STATUSES.includes(order.orderStatus)) return null;
  if (order.deliveryMethod === "pickup") {
    return [
      "We're preparing your order",
      `Pick it up at ${pickupAddress} (${pickupHours})`,
      "Bring your order number when you collect it",
    ];
  }
  if (order.paymentStatus === "paid") {
    return ["Payment confirmed", "We're preparing your order", "It ships — track its progress right here"];
  }
  if (order.paymentMethod === "bank_transfer") {
    return [
      "We verify your bank transfer (usually within 1 business day)",
      "Once confirmed, we prepare and ship your order",
      "Track its progress right here",
    ];
  }
  if (order.paymentMethod === "cod") {
    return [
      "We're preparing your order",
      "A courier picks it up and delivers to your door",
      "Pay in cash when it arrives",
    ];
  }
  return ["We're confirming your payment", "We're preparing your order", "Track its progress right here"];
}

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

  const [bankDetails, recommendations, general, shipping, zones] = await Promise.all([
    order.paymentMethod === "bank_transfer" && order.paymentStatus === "awaiting_verification"
      ? getBankTransferSettings()
      : Promise.resolve(null),
    getCartRecommendations(
      order.items.map((item) => item.productId).filter((id): id is string => Boolean(id)),
      4,
    ),
    getGeneralSettings(),
    getShippingSettings(),
    getActiveDeliveryZones(),
  ]);
  const pickupAddress = shipping.pickupAddress;
  const pickupHours = shipping.pickupHours;

  const isDelivered = order.orderStatus === "delivered";
  // Delivered still shows this block (as a completed fact, not an
  // estimate) — only the truly "nothing more to say here" statuses
  // (their own panels already explain) hide it entirely.
  const showDeliveryEstimate =
    order.orderStatus !== "cancelled" && order.orderStatus !== "returned" && order.orderStatus !== "failed_delivery";
  const delivery =
    !isDelivered && order.deliveryMethod !== "pickup"
      ? getEstimatedDeliveryRange(
          new Date(order.createdAt),
          isColomboZoneAddress(
            order.shippingAddressDetail?.district ?? "",
            order.shippingAddressDetail?.postalCode,
          ),
        )
      : null;
  const deliveredAt = order.statusHistory?.find((h) => h.status === "delivered")?.changedAt ?? null;

  const whatsappOrderMessage = `Hi, I have a question about my order ${order.orderNumber}`;
  const trackOrderHref = `/track-order?orderNumber=${encodeURIComponent(order.orderNumber)}`;
  const invoiceHref = order.orderId ? `/invoices/${order.orderId}` : undefined;
  const nextSteps = whatsNextSteps(order, pickupAddress, pickupHours);

  return (
    <div className="mx-auto w-full max-w-[var(--container-width)] flex-1 px-6 py-[var(--section-padding-y)] max-sm:py-12">
      {/* Only for a genuinely placed order -- not one that's already been
          cancelled by the time this page is reached (an unusual path, but
          firing Purchase for it would misreport real revenue). */}
      {order.orderStatus !== "cancelled" && (
        <PurchaseTracker
          orderNumber={order.orderNumber}
          total={order.total}
          productIds={order.items.map((item) => item.productId).filter((id): id is string => Boolean(id))}
        />
      )}
      <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
        <div className="flex flex-col gap-6">
          {/* 1. Success header */}
          <section>
            <OrderSuccessCheck />
            <h1 className="mt-4 text-center font-heading text-2xl font-bold tracking-tight lg:text-left">
              {CONFIRMATION_HEADINGS[order.orderStatus]}
            </h1>
            <div className="mt-3 flex justify-center lg:justify-start">
              <CopyOrderNumber orderNumber={order.orderNumber} />
            </div>
            <div className="mt-3">
              <OrderStatusSection order={order} />
            </div>
          </section>

          {/* 2. Estimated delivery / delivery outcome */}
          {showDeliveryEstimate && (
            <section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--color-card)] p-4">
              {isDelivered ? (
                <>
                  <p className="text-xs text-[var(--muted)] uppercase tracking-wide">
                    {order.deliveryMethod === "pickup" ? "Picked up" : "Delivered"}
                  </p>
                  <p className="mt-1 text-xl font-semibold tracking-tight">
                    {deliveredAt
                      ? `${order.deliveryMethod === "pickup" ? "Picked up" : "Delivered"} on ${formatStepDate(deliveredAt)}`
                      : order.deliveryMethod === "pickup"
                        ? "Picked up"
                        : "Delivered"}
                  </p>
                </>
              ) : delivery ? (
                <>
                  <p className="text-xs text-[var(--muted)] uppercase tracking-wide">Estimated delivery</p>
                  <p className="mt-1 text-xl font-semibold tracking-tight">{delivery.label.replace(/^Get it by /, "Arriving ")}</p>
                </>
              ) : (
                <>
                  <p className="text-xs text-[var(--muted)] uppercase tracking-wide">Store pickup</p>
                  <p className="mt-1 text-xl font-semibold tracking-tight">{pickupAddress}</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">{pickupHours}</p>
                </>
              )}
            </section>
          )}

          {/* 4. What happens next */}
          {nextSteps && (
            <section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--color-card)] p-4">
              <h2 className="text-sm font-semibold">What happens next</h2>
              <ol className="mt-3 flex flex-col gap-2 text-sm text-[var(--muted)]">
                {nextSteps.map((step, index) => (
                  <li key={index} className="flex gap-2">
                    <span className="font-medium text-[var(--foreground)]">{index + 1}.</span>
                    {step}
                  </li>
                ))}
              </ol>

              {bankDetails && (
                <div className="mt-4 rounded-[var(--radius-input)] border border-[var(--border)] bg-black/5 px-3 py-3 text-sm">
                  <p className="font-medium text-[var(--foreground)]">Transfer to</p>
                  <p className="mt-1 text-[var(--muted)]">{bankDetails.bank_name}</p>
                  <p className="text-[var(--muted)]">{bankDetails.account_name}</p>
                  <p className="text-[var(--muted)]">{bankDetails.account_number}</p>
                  <p className="text-[var(--muted)]">{bankDetails.branch}</p>
                  {order.paymentReference && (
                    <p className="mt-2 text-[var(--muted)]">Your reference: {order.paymentReference}</p>
                  )}
                  <p className="mt-2 text-[var(--muted)]">
                    Already sent the transfer?{" "}
                    <a
                      href={getWhatsAppUrl(
                        `Hi, I've sent the bank transfer for order ${order.orderNumber} — here's my slip.`,
                        general.whatsappNumber,
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      Message us your slip on WhatsApp
                    </a>{" "}
                    for faster verification.
                  </p>
                </div>
              )}
            </section>
          )}

          {/* 5. Delivery address */}
          {order.deliveryMethod !== "pickup" && order.shippingAddressDetail && (
            <div>
              <DeliveryAddressCard
                deliveryMethod={order.deliveryMethod}
                addressDetail={order.shippingAddressDetail}
                shippingAddress={order.shippingAddress}
              />
              {!TERMINAL_STATUSES.includes(order.orderStatus) && (
                <p className="mt-3 text-xs text-[var(--muted)] print:hidden">
                  Need to change something? Message us on WhatsApp within 2 hours of ordering and we&apos;ll
                  do our best to update it before it ships —{" "}
                  <a
                    href={getWhatsAppUrl(
                      `Hi, I need to change something about my order ${order.orderNumber}`,
                      general.whatsappNumber,
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    message us now
                  </a>
                  .
                </p>
              )}
            </div>
          )}

          {(order.courier || order.trackingNumber || order.trackingUrl) && (
            <section className="rounded-[var(--radius-card)] border border-[var(--border)] p-4 text-sm">
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
            </section>
          )}

          {/* 7. Confirmation email */}
          {order.customerEmail && (
            <p className="text-sm text-[var(--muted)]">
              Confirmation email sent to <strong>{order.customerEmail}</strong> — check your spam folder if
              you don&apos;t see it.
            </p>
          )}

          {/* 8. Guest account prompt */}
          {order.isGuest && (
            <div className="print:hidden">
              <CreateAccountPrompt email={order.customerEmail} fullName={order.customerName} />
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3 print:hidden">
            <Link
              href={trackOrderHref}
              className="transition-brand inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--foreground)] px-5 text-sm font-medium text-white hover:bg-[var(--color-btn-hover)]"
            >
              <TruckIcon className="h-4 w-4" />
              Track Order
            </Link>
            {invoiceHref && (
              <a
                href={invoiceHref}
                className="transition-brand inline-flex min-h-11 items-center rounded-full border border-[var(--border)] px-5 text-sm font-medium hover:bg-black/5"
              >
                Download Invoice
              </a>
            )}
            <Link
              href="/shop"
              className="transition-brand inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--border)] px-5 text-sm font-medium hover:bg-black/5"
            >
              <ShoppingBagIcon className="h-4 w-4" />
              Continue Shopping
            </Link>
            <a
              href={getWhatsAppUrl(whatsappOrderMessage, general.whatsappNumber)}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-brand inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--border)] px-5 text-sm font-medium hover:bg-black/5"
            >
              <WhatsAppIcon className="h-4 w-4 text-[#25D366]" />
              Message us about this order
            </a>
          </div>
        </div>

        <div className="print:hidden">
          <OrderSummaryCard order={order} zones={zones} />
        </div>
      </div>

      {recommendations.length > 0 && (
        <div className="print:hidden">
          <RelatedProducts products={recommendations} />
        </div>
      )}
    </div>
  );
}
