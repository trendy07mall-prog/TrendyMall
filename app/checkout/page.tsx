"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { createOrder } from "@/lib/orders";
import { formatPrice } from "@/lib/utils";

const DELIVERY_OPTIONS = [
  { id: "western", label: "Western Province & Colombo", fee: 255 },
  { id: "other", label: "Outside Western Province", fee: 400 },
] as const;

export default function CheckoutPage() {
  const { items, subtotal, clear } = useCart();
  const router = useRouter();
  const [deliveryArea, setDeliveryArea] = useState<(typeof DELIVERY_OPTIONS)[number]["id"]>(
    "western",
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shippingFee =
    DELIVERY_OPTIONS.find((option) => option.id === deliveryArea)?.fee ?? 0;
  const total = subtotal + shippingFee;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (items.length === 0) {
      setError("Your cart is empty.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    setPending(true);

    const result = await createOrder({
      customerName: String(formData.get("name") ?? ""),
      customerEmail: String(formData.get("email") ?? ""),
      customerPhone: String(formData.get("phone") ?? ""),
      shippingAddress: String(formData.get("address") ?? ""),
      shippingFee,
      items: items.map((item) => ({
        productId: item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      })),
    });

    setPending(false);

    if (result.error || !result.orderId) {
      setError(result.error ?? "Could not place order.");
      return;
    }

    clear();
    router.push(`/checkout/success?orderId=${result.orderId}`);
  }

  return (
    <div className="mx-auto grid w-full max-w-4xl flex-1 gap-10 px-6 py-12 sm:grid-cols-2">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">Checkout</h1>
        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <Field id="name" name="name" label="Full name" required />
          <Field
            id="email"
            name="email"
            label="Email"
            type="email"
            required
          />
          <Field id="phone" name="phone" label="Phone" required />

          <div className="flex flex-col gap-1">
            <label htmlFor="address" className="text-sm font-medium">
              Shipping address
            </label>
            <textarea
              id="address"
              name="address"
              required
              rows={4}
              className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]"
            />
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Delivery area</span>
            {DELIVERY_OPTIONS.map((option) => (
              <label
                key={option.id}
                className="flex items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] px-3 py-2 text-sm"
              >
                <span className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="deliveryArea"
                    checked={deliveryArea === option.id}
                    onChange={() => setDeliveryArea(option.id)}
                  />
                  {option.label}
                </span>
                <span className="text-[var(--muted)]">{formatPrice(option.fee)}</span>
              </label>
            ))}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <p className="text-xs text-[var(--muted)]">
            Payment is not collected yet — your order will be saved as
            &quot;pending payment&quot; and we&apos;ll follow up on payment
            separately.
          </p>

          <button
            type="submit"
            disabled={pending || items.length === 0}
            className="mt-2 rounded-full bg-[var(--foreground)] px-4 py-3 text-sm font-medium text-white transition-opacity hover:opacity-85 disabled:opacity-50"
          >
            {pending ? "Placing order…" : `Place order — ${formatPrice(total)}`}
          </button>
        </form>
      </div>

      <div>
        <h2 className="text-lg font-medium">Order summary</h2>
        <ul className="mt-4 flex flex-col gap-3">
          {items.map((item) => (
            <li
              key={item.productId}
              className="flex justify-between text-sm"
            >
              <span>
                {item.name} × {item.quantity}
              </span>
              <span>{formatPrice(item.price * item.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-col gap-2 border-t border-[var(--border)] pt-4 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Delivery</span>
            <span>{formatPrice(shippingFee)}</span>
          </div>
          <div className="flex justify-between font-medium">
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  id,
  name,
  label,
  type = "text",
  required,
}: {
  id: string;
  name: string;
  label: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]"
      />
    </div>
  );
}
