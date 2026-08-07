"use client";

import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { getVariantPrice } from "@/lib/utils";
import type { AttributeSelection, Product, ProductVariant } from "@/types";

export function BuyNowButton({
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
  onBeforeAdd?: () => boolean;
  className?: string;
}) {
  const { addItem } = useCart();
  const router = useRouter();

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
        router.push("/checkout");
      }}
      className={
        className ??
        "min-w-0 flex-1 rounded-[var(--radius-btn)] border border-[var(--foreground)] px-6 py-3 text-center text-sm font-semibold transition-colors hover:bg-black/5 disabled:opacity-40"
      }
    >
      Buy Now
    </button>
  );
}
