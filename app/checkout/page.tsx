"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { createOrder } from "@/lib/orders";
import { formatPrice } from "@/lib/utils";

export default function CheckoutPage() {
  const { items, subtotal, clear } = useCart();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        <h1 className="text-2xl font-semibold tracking-tight">Checkout</h1>
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
              className="border border-black bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black dark:border-white dark:focus:ring-white"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <p className="text-xs text-zinc-500">
            Payment is not collected yet — your order will be saved as
            &quot;pending payment&quot; and we&apos;ll follow up on payment
            separately.
          </p>

          <button
            type="submit"
            disabled={pending || items.length === 0}
            className="mt-2 bg-black px-4 py-3 text-sm font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {pending
              ? "Placing order…"
              : `Place order — ${formatPrice(subtotal)}`}
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
        <div className="mt-4 flex justify-between border-t border-black pt-4 text-sm font-medium dark:border-white">
          <span>Total</span>
          <span>{formatPrice(subtotal)}</span>
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
        className="border border-black bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black dark:border-white dark:focus:ring-white"
      />
    </div>
  );
}
