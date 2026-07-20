"use client";

import { useWishlist } from "@/context/WishlistContext";
import { HeartIcon } from "@/components/ui/Icon";
import type { Product } from "@/types";

export function WishlistButton({
  product,
  className,
}: {
  product: Product;
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
          price: product.price,
          image: product.images[0] ?? null,
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
