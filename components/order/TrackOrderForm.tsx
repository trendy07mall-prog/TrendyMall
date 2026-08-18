"use client";

import { useState } from "react";
import Image from "next/image";
import { trackOrder } from "@/lib/track-order";
import { OrderStatusSection } from "@/components/order/OrderStatusSection";
import { DeliveryAddressCard } from "@/components/order/DeliveryAddressCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { FieldError } from "@/components/ui/FieldError";
import { PackageIcon } from "@/components/ui/Icon";
import { formatPrice } from "@/lib/utils";
import type { GuestOrderDetail } from "@/types";

const inputClass =
  "min-h-11 rounded-[var(--radius-input)] border border-[var(--border)] bg-transparent px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]";

// Visual redesign only -- the lookup call (trackOrder(orderNumber, contact)),
// its single generic "couldn't find" error for both a wrong order number
// AND a wrong contact on a real order, and every field this form sends
// are all unchanged from before. Security-relevant behavior lives entirely
// in lib/track-order.ts and the track_order Postgres function, neither of
// which this file touches.
export function TrackOrderForm({ defaultOrderNumber }: { defaultOrderNumber?: string }) {
  const [orderNumber, setOrderNumber] = useState(defaultOrderNumber ?? "");
  const [contact, setContact] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<GuestOrderDetail | null>(null);
  const [searched, setSearched] = useState(false);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="mx-auto w-full max-w-md rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--color-card)] p-[var(--card-padding)] shadow-[var(--shadow-card-hover)]">
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setPending(true);
            setError("");
            setOrder(null);
            setSearched(true);
            const result = await trackOrder(orderNumber, contact);
            setPending(false);
            if (result.order) setOrder(result.order);
            else setError(result.error ?? "Something went wrong. Please try again.");
          }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1">
            <label htmlFor="orderNumber" className="text-sm font-medium">
              Order number
            </label>
            <input
              id="orderNumber"
              type="text"
              required
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="TM-000123"
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="contact" className="text-sm font-medium">
              Phone or email used for the order
            </label>
            <input
              id="contact"
              type="text"
              required
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              className={inputClass}
            />
          </div>
          {error && <FieldError message={error} />}
          <button
            type="submit"
            disabled={pending}
            className="transition-brand min-h-11 rounded-[var(--radius-btn)] bg-[#16A34A] px-6 py-3 text-sm font-semibold text-white hover:bg-[#15803d] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Checking…" : "Track Order"}
          </button>
        </form>
      </div>

      {!searched && (
        <div className="mx-auto flex max-w-md flex-col items-center gap-2 py-6 text-center">
          <PackageIcon className="h-8 w-8 shrink-0 text-[var(--muted)]" />
          <p className="text-sm text-[var(--muted)]">
            Enter your details above and we&apos;ll show your order&apos;s current status, items, and
            delivery info.
          </p>
        </div>
      )}

      {pending && (
        <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--color-card)] p-[var(--card-padding)]">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="mt-3 h-3 w-40" />
          <div className="mt-4 flex flex-col gap-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      )}

      {order && (
        <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--color-card)] p-[var(--card-padding)] text-sm">
          <div className="flex items-center justify-between">
            <p className="font-medium">{order.orderNumber}</p>
            <p className="text-[var(--muted)]">
              Placed {new Date(order.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="mt-3">
            <OrderStatusSection order={order} />
          </div>

          <ul className="mt-4 flex flex-col gap-3">
            {order.items.map((item, index) => (
              <li
                key={index}
                className="flex items-center gap-3 border-b border-[var(--border)] pb-3"
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

          <div className="mt-4 flex flex-col gap-2 border-t border-[var(--border)] pt-4 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            {order.couponCode && (
              <div className="flex justify-between text-[var(--muted)]">
                <span>Coupon</span>
                <span>{order.couponCode}</span>
              </div>
            )}
            <div className="flex justify-between text-[var(--muted)]">
              <span>Delivery</span>
              <span>
                {order.deliveryMethod === "pickup" ? "Store Pickup" : formatPrice(order.shippingFee)}
              </span>
            </div>
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

          <div className="mt-4">
            <DeliveryAddressCard
              deliveryMethod={order.deliveryMethod}
              addressDetail={order.shippingAddressDetail}
              shippingAddress={order.shippingAddress}
            />
          </div>

          {(order.courier || order.trackingNumber || order.trackingUrl) && (
            <div className="mt-4 rounded-[var(--radius-md)] border border-[var(--border)] px-4 py-3">
              <p className="font-medium">Tracking</p>
              {order.courier && <p className="mt-1 text-[var(--muted)]">Courier: {order.courier}</p>}
              {order.trackingNumber && (
                <p className="text-[var(--muted)]">Tracking number: {order.trackingNumber}</p>
              )}
              {order.trackingUrl && (
                <a
                  href={order.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  Track shipment
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
