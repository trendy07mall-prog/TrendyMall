import Image from "next/image";
import { formatPrice } from "@/lib/utils";
import { describeDeliveryFee, type DeliveryZone } from "@/lib/delivery-fee";
import { PAYMENT_METHOD_LABELS } from "@/lib/payment-methods";
import type { GuestOrderDetail } from "@/types";

// The sticky right-column card on /order-confirmation — same shell as
// the checkout/cart order-summary sidebar (rounded-[20px], --shadow-card,
// lg:sticky lg:top-24), just page-specific content.
export function OrderSummaryCard({ order, zones }: { order: GuestOrderDetail; zones: DeliveryZone[] }) {
  const deliveryReason = order.shippingAddressDetail
    ? describeDeliveryFee(
        {
          district: order.shippingAddressDetail.district,
          postalCode: order.shippingAddressDetail.postalCode,
          deliveryMethod: order.deliveryMethod,
        },
        zones,
      ).reason
    : null;

  return (
    <div className="h-fit rounded-[20px] border border-[var(--border)] bg-[var(--color-card)] p-6 shadow-[var(--shadow-card)] lg:sticky lg:top-24">
      <h2 className="text-lg font-medium">Order summary</h2>

      <ul className="mt-4 flex flex-col gap-3">
        {order.items.map((item, index) => (
          <li key={index} className="flex items-center gap-3 text-sm">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-black/5">
              {item.imageUrl && (
                <Image src={item.imageUrl} alt="" fill sizes="48px" className="object-cover" />
              )}
            </div>
            <div className="flex flex-1 items-center justify-between">
              <span>
                {item.productName}
                {item.variantName && (
                  <span className="text-[var(--muted)]"> ({item.variantName})</span>
                )}
                {item.attributeSelections && item.attributeSelections.length > 0 && (
                  <span className="text-[var(--muted)]">
                    {" "}
                    ({item.attributeSelections.map((s) => `${s.attributeName}: ${s.value}`).join(", ")})
                  </span>
                )}{" "}
                × {item.quantity}
              </span>
              <span>{formatPrice(item.subtotal)}</span>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-col gap-2 border-t border-[var(--border)] pt-4 text-sm">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatPrice(order.subtotal)}</span>
        </div>
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
        {order.couponCode && (
          <div className="flex justify-between text-[var(--muted)]">
            <span>Coupon</span>
            <span>{order.couponCode}</span>
          </div>
        )}
        {order.discount > 0 && (
          <div className="flex justify-between text-[var(--color-discount)]">
            <span>Discount</span>
            <span>-{formatPrice(order.discount)}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-[var(--border)] pt-2 text-base font-medium">
          <span>Total</span>
          <span>{formatPrice(order.total)}</span>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-1 border-t border-[var(--border)] pt-4 text-xs text-[var(--muted)]">
        <div className="flex justify-between">
          <span>Payment method</span>
          <span>{PAYMENT_METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod}</span>
        </div>
        <div className="flex justify-between">
          <span>Order date</span>
          <span>{new Date(order.createdAt).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}
