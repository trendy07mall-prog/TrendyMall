"use client";

import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { getEffectiveVariantPrice } from "@/lib/utils";
import type { Product, ProductVariant } from "@/types";

export function AddToCartForm({
  product,
  variant = null,
  image,
  quantity,
  outOfStock = false,
}: {
  product: Product;
  variant?: ProductVariant | null;
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
          price: getEffectiveVariantPrice(product, variant),
          image,
          quantity,
          variantId: variant?.id ?? null,
          variantName: variant?.color_name ?? null,
          variantColorHex: variant?.color_hex ?? null,
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
