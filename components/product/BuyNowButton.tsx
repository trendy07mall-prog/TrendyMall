"use client";

import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { getEffectivePrice } from "@/lib/utils";
import type { Product } from "@/types";

export function BuyNowButton({
  product,
  image,
}: {
  product: Product;
  image: string | null;
}) {
  const { addItem } = useCart();
  const router = useRouter();
  const outOfStock = product.stock <= 0;

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
          quantity: 1,
        });
        router.push("/checkout");
      }}
      className="rounded-full bg-[var(--foreground)] px-6 py-3 text-sm font-medium text-white transition-transform hover:scale-[1.03] disabled:opacity-40"
    >
      Buy Now
    </button>
  );
}
