"use client";

import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { getEffectivePrice } from "@/lib/utils";
import type { Product } from "@/types";

export function AddToCartForm({
  product,
  image,
  quantity,
  outOfStock = false,
}: {
  product: Product;
  image: string | null;
  quantity: number;
  outOfStock?: boolean;
}) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  return (
    <button
      type="button"
      disabled={outOfStock}
      onClick={() => {
        addItem({
          productId: product.id,
          slug: product.slug,
          name: product.name,
          price: getEffectivePrice(product),
          image,
          quantity,
        });
        setAdded(true);
        setTimeout(() => setAdded(false), 1500);
      }}
      className="rounded-full border border-[var(--foreground)] px-6 py-3 text-sm font-medium transition-transform hover:scale-[1.03] disabled:opacity-40"
    >
      {outOfStock ? "Out of stock" : added ? "Added ✓" : "Add to Cart"}
    </button>
  );
}
