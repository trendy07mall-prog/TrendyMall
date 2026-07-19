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
        <label htmlFor="qty" className="text-sm font-medium">
          Qty
        </label>
        <input
          id="qty"
          type="number"
          min={1}
          max={product.stock}
          value={qty}
          disabled={outOfStock}
          onChange={(e) =>
            setQty(
              Math.max(1, Math.min(product.stock, Number(e.target.value) || 1)),
            )
          }
          className="w-20 border border-black bg-transparent px-2 py-1 text-sm dark:border-white"
        />
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
        className="bg-black px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-40 dark:bg-white dark:text-black"
      >
        {outOfStock ? "Out of stock" : added ? "Added ✓" : "Add to cart"}
      </button>
    </div>
  );
}
