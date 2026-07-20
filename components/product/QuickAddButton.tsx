"use client";

import { useState } from "react";
import { useCart } from "@/context/CartContext";
import type { Product } from "@/types";

export function QuickAddButton({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const outOfStock = product.stock <= 0;

  return (
    <button
      type="button"
      disabled={outOfStock}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        addItem({
          productId: product.id,
          slug: product.slug,
          name: product.name,
          price: product.price,
          image: product.images[0] ?? null,
          quantity: 1,
        });
        setAdded(true);
        setTimeout(() => setAdded(false), 1200);
      }}
      className="w-full rounded-full bg-[var(--foreground)] py-2 text-xs font-medium text-white transition-all hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-40"
    >
      {outOfStock ? "Out of stock" : added ? "Added ✓" : "Add to Cart"}
    </button>
  );
}
