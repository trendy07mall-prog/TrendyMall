"use client";

import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { getVariantPrice } from "@/lib/utils";
import { trackConversion } from "@/lib/analytics/track";
import type { AttributeSelection, Product, ProductVariant } from "@/types";

export function AddToCartForm({
  product,
  variant = null,
  attributeSelections = [],
  image,
  quantity,
  outOfStock = false,
  onBeforeAdd,
  className,
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
  className?: string;
}) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  return (
    <button
      type="button"
      disabled={outOfStock}
      onClick={() => {
        if (onBeforeAdd && !onBeforeAdd()) return;
        const price = variant ? getVariantPrice(variant) : 0;
        addItem({
          productId: product.id,
          slug: product.slug,
          name: product.name,
          price,
          image,
          quantity,
          variantId: variant?.id ?? null,
          variantName: variant?.color_name ?? null,
          variantColorHex: variant?.color_hex ?? null,
          attributeSelections,
        });
        trackConversion("AddToCart", {
          productId: product.id,
          value: price * quantity,
          pixelParams: {
            content_ids: [product.id],
            content_name: product.name,
            content_type: "product",
            value: price * quantity,
            currency: "LKR",
          },
        });
        setAdded(true);
        setTimeout(() => setAdded(false), 1500);
      }}
      className={
        className ??
        "w-full rounded-[var(--radius-btn)] bg-[var(--foreground)] px-6 py-3.5 text-sm font-semibold text-white transition-transform hover:scale-[1.02] disabled:opacity-40"
      }
    >
      {outOfStock ? "Out of stock" : added ? "Added ✓" : "Add to Cart"}
    </button>
  );
}
