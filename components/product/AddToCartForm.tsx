"use client";

import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { getVariantPrice } from "@/lib/utils";
import type { AttributeSelection, Product, ProductVariant } from "@/types";

export function AddToCartForm({
  product,
  variant = null,
  attributeSelections = [],
  image,
  quantity,
  outOfStock = false,
  onBeforeAdd,
}: {
  product: Product;
  variant?: ProductVariant | null;
  attributeSelections?: AttributeSelection[];
  image: string | null;
  quantity: number;
  outOfStock?: boolean;
  // Returning false blocks the add (and lets the caller show its own
  // prompt, e.g. "select a color") instead of adding an incomplete
  // selection to the cart.
  onBeforeAdd?: () => boolean;
}) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  return (
    <button
      type="button"
      disabled={outOfStock}
      onClick={() => {
        if (onBeforeAdd && !onBeforeAdd()) return;
        addItem({
          productId: product.id,
          slug: product.slug,
          name: product.name,
          price: variant ? getVariantPrice(variant) : 0,
          image,
          quantity,
          variantId: variant?.id ?? null,
          variantName: variant?.color_name ?? null,
          variantColorHex: variant?.color_hex ?? null,
          attributeSelections,
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
