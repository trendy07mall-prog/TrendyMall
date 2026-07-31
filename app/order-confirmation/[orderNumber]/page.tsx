import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBankTransferSettings } from "@/lib/bankTransferSettings";
import { getCartRecommendations } from "@/lib/cart-recommendations";
import { getEstimatedDeliveryRange } from "@/lib/delivery";
import { getPaymentDisplay } from "@/lib/order-display";
import { getWhatsAppUrl } from "@/lib/site";
import { OrderStatusBadge } from "@/components/order/OrderStatusBadge";
import { OrderSuccessCheck } from "@/components/order/OrderSuccessCheck";
import { PendingPaymentPoller } from "@/components/order/PendingPaymentPoller";
import { OrderTimeline } from "@/components/order/OrderTimeline";
import { OrderSummaryCard } from "@/components/order/OrderSummaryCard";
import { CopyOrderNumber } from "@/components/order/CopyOrderNumber";
import { CreateAccountPrompt } from "@/components/checkout/CreateAccountPrompt";
import { RelatedProducts } from "@/components/product/RelatedProducts";
import { TruckIcon, ShoppingBagIcon, WhatsAppIcon } from "@/components/ui/Icon";
import type { GuestOrderDetail } from "@/types";

// Store pickup's fixed location — same copy as CheckoutForm.tsx's
// PICKUP_ADDRESS/PICKUP_HOURS. Duplicated, not extracted: this is only
// the second place that needs it, and this codebase's own convention
// (see lib/site.ts's WHATSAPP_NUMBER comment) is to extract on the third
// use, not the second.
const PICKUP_ADDRESS = "Salawatta Road, Wellampitiya";
const PICKUP_HOURS = "Daily, 10am – 4pm";

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

function whatsNextSteps(order: GuestOrderDetail): string[] {
  if (order.deliveryMethod === "pickup") {
    return [
      "We're preparing your order",
      `Pick it up at ${PICKUP_ADDRESS} (${PICKUP_HOURS})`,
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

  const payment = getPaymentDisplay({
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    total: order.total,
  });

  const [bankDetails, recommendations] = await Promise.all([
    order.paymentMethod === "bank_transfer" && order.paymentStatus === "awaiting_verification"
      ? getBankTransferSettings()
      : Promise.resolve(null),
    getCartRecommendations(
      order.items.map((item) => item.productId).filter((id): id is string => Boolean(id)),
      4,
    ),
  ]);

  const delivery =
    order.deliveryMethod === "pickup" ? null : getEstimatedDeliveryRange(new Date(order.createdAt));

  const whatsappOrderMessage = `Hi, I have a question about my order ${order.orderNumber}`;
  const trackOrderHref = `/track-order?orderNumber=${encodeURIComponent(order.orderNumber)}`;
  const invoiceHref = order.orderId ? `/invoices/${order.orderId}` : undefined;

  return (
    <div className="mx-auto w-full max-w-[var(--container-width)] flex-1 px-6 py-[var(--section-padding-y)] max-sm:py-12">
      <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
        <div className="flex flex-col gap-6">
          {/* 1. Success header */}
          <section>
            <OrderSuccessCheck />
            <h1 className="mt-4 text-center font-heading text-2xl font-bold tracking-tight lg:text-left">
              Thank you — order placed
            </h1>
            <div className="mt-3 flex justify-center lg:justify-start">
              <CopyOrderNumber orderNumber={order.orderNumber} />
            </div>
            {order.paymentMethod === "payhere" && order.paymentStatus === "pending" && <PendingPaymentPoller />}
            <div className="mt-3 flex flex-col items-center gap-2 lg:items-start">
              <div className="flex flex-wrap items-center justify-center gap-2 lg:justify-start">
                <span
                  className="border border-current px-2 py-0.5 text-xs whitespace-nowrap uppercase tracking-wide"
                  title={payment.message}
                >
                  {payment.badge}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
                  Order status:
                  <OrderStatusBadge status={order.orderStatus} />
                </span>
              </div>
              <p className="text-center text-sm text-[var(--muted)] lg:text-left">{payment.message}</p>
            </div>
          </section>

          {/* 2. Estimated delivery */}
          <section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--color-card)] p-4">
            {delivery ? (
              <>
                <p className="text-xs text-[var(--muted)] uppercase tracking-wide">Estimated delivery</p>
                <p className="mt-1 text-xl font-semibold tracking-tight">{delivery.label.replace(/^Get it by /, "Arriving ")}</p>
              </>
            ) : (
              <>
                <p className="text-xs text-[var(--muted)] uppercase tracking-wide">Store pickup</p>
                <p className="mt-1 text-xl font-semibold tracking-tight">{PICKUP_ADDRESS}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">{PICKUP_HOURS}</p>
              </>
            )}
          </section>

          {/* 3. Order timeline */}
          <section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--color-card)] p-4">
            <h2 className="text-sm font-semibold">Order status</h2>
            <div className="mt-4">
              <OrderTimeline status={order.orderStatus} />
            </div>
          </section>

          {/* 4. What happens next */}
          <section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--color-card)] p-4">
            <h2 className="text-sm font-semibold">What happens next</h2>
            <ol className="mt-3 flex flex-col gap-2 text-sm text-[var(--muted)]">
              {whatsNextSteps(order).map((step, index) => (
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

          {/* 5. Delivery address */}
          {order.deliveryMethod !== "pickup" && order.shippingAddressDetail && (
            <section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--color-card)] p-4 text-sm">
              <h2 className="text-sm font-semibold">Delivery address</h2>
              <p className="mt-2 text-[var(--muted)]">
                {order.shippingAddressDetail.street}, {order.shippingAddressDetail.city},{" "}
                {order.shippingAddressDetail.district}
                {order.shippingAddressDetail.postalCode ? ` ${order.shippingAddressDetail.postalCode}` : ""}
              </p>
              <p className="mt-3 text-xs text-[var(--muted)] print:hidden">
                Need to change something? Message us on WhatsApp within 2 hours of ordering and we&apos;ll
                do our best to update it before it ships —{" "}
                <a
                  href={getWhatsAppUrl(
                    `Hi, I need to change something about my order ${order.orderNumber}`,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  message us now
                </a>
                .
              </p>
            </section>
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
              href={getWhatsAppUrl(whatsappOrderMessage)}
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
          <OrderSummaryCard order={order} />
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
