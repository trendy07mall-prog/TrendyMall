"use client";

import { useState } from "react";
import Image from "next/image";
import { trackOrder } from "@/lib/track-order";
import { OrderStatusSection } from "@/components/order/OrderStatusSection";
import { DeliveryAddressCard } from "@/components/order/DeliveryAddressCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { FieldError } from "@/components/ui/FieldError";
import { formatPrice } from "@/lib/utils";
import type { GuestOrderDetail } from "@/types";

const inputClass =
  "rounded-[var(--radius-sm)] border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]";

export function TrackOrderForm({ defaultOrderNumber }: { defaultOrderNumber?: string }) {
  const [orderNumber, setOrderNumber] = useState(defaultOrderNumber ?? "");
  const [contact, setContact] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<GuestOrderDetail | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setPending(true);
          setError("");
          setOrder(null);
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
          className="self-start rounded-full bg-[var(--foreground)] px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-85 disabled:opacity-50"
        >
          {pending ? "Checking…" : "Track order"}
        </button>
      </form>

      {pending && (
        <div className="rounded-[var(--radius-md)] border border-[var(--border)] p-4">
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
        <div className="rounded-[var(--radius-md)] border border-[var(--border)] p-4 text-sm">
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
