"use client";

import { useWishlist } from "@/context/WishlistContext";
import { HeartIcon } from "@/components/ui/Icon";

export function WishlistButton({
  productId,
  slug,
  name,
  price,
  variantId,
  image,
  className,
}: {
  productId: string;
  slug: string;
  name: string;
  price: number;
  variantId: string | null;
  image: string | null;
  className?: string;
}) {
  const { toggle, has } = useWishlist();
  const active = has(productId);

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? "Remove from wishlist" : "Add to wishlist"}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggle({ productId, slug, name, price, variantId, image });
      }}
      className={
        className ??
        "transition-brand flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-white hover:bg-black/5 group-hover:scale-110"
      }
    >
      <HeartIcon className="h-4 w-4" filled={active} />
    </button>
  );
}
