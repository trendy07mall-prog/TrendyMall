import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyOrderDetail } from "@/lib/orders/order-detail";
import { formatPrice } from "@/lib/utils";
import { getWhatsAppUrl } from "@/lib/site";
import { OrderStatusBadges } from "@/components/order/OrderStatusBadges";
import { OrderTimeline } from "@/components/order/OrderTimeline";
import { DeliveryAddressCard } from "@/components/order/DeliveryAddressCard";
import { OrderSummaryCard } from "@/components/order/OrderSummaryCard";
import { PendingPaymentPoller } from "@/components/order/PendingPaymentPoller";
import { ReorderButton } from "@/components/order/ReorderButton";
import { CancelOrderButton } from "@/components/order/CancelOrderButton";
import { WhatsAppIcon } from "@/components/ui/Icon";

const actionClass =
  "transition-brand inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--border)] px-5 text-sm font-medium hover:bg-black/5";

// Status-first, repeatedly-visited view — distinct from /order-confirmation
// (one-time, celebratory, keyed by the guessable order number + token).
// Keyed by UUID, protected purely by RLS (orders_select_own_or_admin and
// friends already scope every table involved to the caller's own rows —
// no extra ownership check needed here, confirmed empirically in
// verification, not just by reading policy text).
export default async function AccountOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getMyOrderDetail(id);
  if (!order) notFound();

  // A product slug per item, for "link back to the product" — a small,
  // page-specific lookup rather than widening GuestOrderItem (shared
  // across 4 RPCs/pages that have no other reason to carry a slug).
  const supabase = await createClient();
  const productIds = order.items.map((item) => item.productId).filter((v): v is string => Boolean(v));
  const { data: products } =
    productIds.length > 0
      ? await supabase.from("products").select("id, slug").in("id", productIds)
      : { data: [] };
  const slugById = new Map((products ?? []).map((p) => [p.id, p.slug]));

  const canCancel = order.orderStatus === "pending" || order.orderStatus === "confirmed";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">Order {order.orderNumber}</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Placed {new Date(order.createdAt).toLocaleString()}</p>
      </div>

      {order.paymentMethod === "payhere" && order.paymentStatus === "pending" && <PendingPaymentPoller />}
      <OrderStatusBadges order={order} />

      <section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--color-card)] p-4">
        <h2 className="text-sm font-semibold">Order status</h2>
        <div className="mt-4">
          <OrderTimeline
            status={order.orderStatus}
            failureReason={order.failureReason}
            deliveryAttemptCount={order.deliveryAttemptCount}
            statusHistory={order.statusHistory}
            createdAt={order.createdAt}
            orderNumber={order.orderNumber}
          />
        </div>
      </section>

      <DeliveryAddressCard
        deliveryMethod={order.deliveryMethod}
        addressDetail={order.shippingAddressDetail}
        shippingAddress={order.shippingAddress}
      />

      <section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--color-card)] p-4">
        <h2 className="text-sm font-semibold">Items</h2>
        <ul className="mt-3 flex flex-col gap-3">
          {order.items.map((item, index) => {
            const slug = item.productId ? slugById.get(item.productId) : undefined;
            const row = (
              <div className="flex flex-1 items-center gap-3 text-sm">
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
              </div>
            );
            return (
              <li key={index} className="border-b border-[var(--border)] pb-3 last:border-0 last:pb-0">
                {slug ? (
                  <Link href={`/product/${slug}`} className="flex transition-opacity hover:opacity-80">
                    {row}
                  </Link>
                ) : (
                  row
                )}
              </li>
            );
          })}
        </ul>
      </section>

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

      <OrderSummaryCard order={order} />

      <div className="flex flex-wrap gap-3">
        <a href={`/invoices/${id}`} className={actionClass}>
          Download Invoice
        </a>
        <ReorderButton orderId={id} className={actionClass} />
        <a
          href={getWhatsAppUrl(`Hi, I have a question about my order ${order.orderNumber}`)}
          target="_blank"
          rel="noopener noreferrer"
          className={actionClass}
        >
          <WhatsAppIcon className="h-4 w-4 text-[#25D366]" />
          Message us on WhatsApp
        </a>
        {canCancel && <CancelOrderButton orderId={id} />}
      </div>
    </div>
  );
}
