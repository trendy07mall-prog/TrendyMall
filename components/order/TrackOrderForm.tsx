"use client";

import { useState } from "react";
import { trackOrder, type TrackedOrder } from "@/lib/track-order";
import { StatusBadge } from "@/components/order/StatusBadge";
import { formatPrice } from "@/lib/utils";

const inputClass =
  "rounded-[var(--radius-sm)] border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]";

export function TrackOrderForm() {
  const [orderNumber, setOrderNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<TrackedOrder | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setPending(true);
          setError("");
          setOrder(null);
          const result = await trackOrder(orderNumber, phone);
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
          <label htmlFor="phone" className="text-sm font-medium">
            Phone number used for the order
          </label>
          <input
            id="phone"
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputClass}
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-full bg-[var(--foreground)] px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-85 disabled:opacity-50"
        >
          {pending ? "Checking…" : "Track order"}
        </button>
      </form>

      {order && (
        <div className="rounded-[var(--radius-md)] border border-[var(--border)] p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{order.orderNumber}</p>
            <StatusBadge status={order.status} />
          </div>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Placed {new Date(order.createdAt).toLocaleDateString()} · {formatPrice(order.total)}
          </p>
        </div>
      )}
    </div>
  );
}
