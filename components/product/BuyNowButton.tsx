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
}: {
  product: Product;
  variant?: ProductVariant | null;
  attributeSelections?: AttributeSelection[];
  image: string | null;
  quantity: number;
  outOfStock?: boolean;
  onBeforeAdd?: () => boolean;
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
      className="rounded-full bg-[var(--foreground)] px-6 py-3 text-sm font-medium text-white transition-transform hover:scale-[1.03] disabled:opacity-40"
    >
      Buy Now
    </button>
  );
}
