"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/utils";
import { CartLineItem } from "@/components/cart/CartLineItem";

export default function CartPage() {
  const { items, subtotal } = useCart();

  if (items.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-6 py-20 text-center">
        <p className="text-4xl">🛒</p>
        <h1 className="font-heading mt-4 text-2xl font-bold tracking-tight">
          Your cart is empty
        </h1>
        <Link
          href="/shop"
          className="mt-6 rounded-full bg-[var(--foreground)] px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-85"
        >
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <h1 className="font-heading text-2xl font-bold tracking-tight">Cart</h1>
      <ul className="mt-8">
        {items.map((item) => (
          <CartLineItem key={item.productId} item={item} />
        ))}
      </ul>
      <div className="mt-6 flex justify-between text-lg font-medium">
        <span>Subtotal</span>
        <span>{formatPrice(subtotal)}</span>
      </div>
      <Link
        href="/checkout"
        className="mt-8 block rounded-full bg-[var(--foreground)] px-6 py-3 text-center text-sm font-medium text-white transition-opacity hover:opacity-85"
      >
        Proceed to checkout
      </Link>
    </div>
  );
}
