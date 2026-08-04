"use client";

import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { getEffectiveVariantPrice } from "@/lib/utils";
import type { Product, ProductVariant } from "@/types";

export function BuyNowButton({
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
  const router = useRouter();

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
        router.push("/checkout");
      }}
      className="rounded-full bg-[var(--foreground)] px-6 py-3 text-sm font-medium text-white transition-transform hover:scale-[1.03] disabled:opacity-40"
    >
      Buy Now
    </button>
  );
}
