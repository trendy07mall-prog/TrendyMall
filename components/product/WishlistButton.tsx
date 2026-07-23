"use client";

import { useWishlist } from "@/context/WishlistContext";
import { HeartIcon } from "@/components/ui/Icon";
import { getEffectivePrice } from "@/lib/utils";
import type { Product } from "@/types";

export function WishlistButton({
  product,
  image,
  className,
}: {
  product: Pick<Product, "id" | "slug" | "name" | "actual_price" | "special_price">;
  image: string | null;
  className?: string;
}) {
  const { toggle, has } = useWishlist();
  const active = has(product.id);

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? "Remove from wishlist" : "Add to wishlist"}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggle({
          productId: product.id,
          slug: product.slug,
          name: product.name,
          price: getEffectivePrice(product),
          image,
        });
      }}
      className={
        className ??
        "flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-white transition-colors hover:bg-black/5"
      }
    >
      <HeartIcon className="h-4 w-4" filled={active} />
    </button>
  );
}
