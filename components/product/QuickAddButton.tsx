"use client";

import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { getEffectivePrice } from "@/lib/utils";
import type { ProductWithPrimaryImage } from "@/types";

export function QuickAddButton({ product }: { product: ProductWithPrimaryImage }) {
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
          price: getEffectivePrice(product),
          image: product.image,
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
