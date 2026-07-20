"use client";

import { useState } from "react";
import { useCart } from "@/context/CartContext";
import type { Product } from "@/types";

export function AddToCartForm({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const outOfStock = product.stock <= 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">Quantity</span>
        <div className="flex items-center rounded-full border border-[var(--border)]">
          <button
            type="button"
            aria-label="Decrease quantity"
            disabled={outOfStock}
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="flex h-9 w-9 items-center justify-center text-lg disabled:opacity-40"
          >
            −
          </button>
          <span className="w-8 text-center text-sm" aria-live="polite">
            {qty}
          </span>
          <button
            type="button"
            aria-label="Increase quantity"
            disabled={outOfStock}
            onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
            className="flex h-9 w-9 items-center justify-center text-lg disabled:opacity-40"
          >
            +
          </button>
        </div>
      </div>
      <button
        type="button"
        disabled={outOfStock}
        onClick={() => {
          addItem({
            productId: product.id,
            slug: product.slug,
            name: product.name,
            price: product.price,
            image: product.images[0] ?? null,
            quantity: qty,
          });
          setAdded(true);
          setTimeout(() => setAdded(false), 1500);
        }}
        className="rounded-full border border-[var(--foreground)] px-6 py-3 text-sm font-medium transition-transform hover:scale-[1.03] disabled:opacity-40"
      >
        {outOfStock ? "Out of stock" : added ? "Added ✓" : "Add to Cart"}
      </button>
    </div>
  );
}
