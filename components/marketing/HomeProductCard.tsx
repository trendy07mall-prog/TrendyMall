"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/context/CartContext";
import { WishlistButton } from "@/components/product/WishlistButton";
import { StarRating } from "@/components/product/StarRating";
import { CartIcon } from "@/components/ui/Icon";
import { formatPrice, getDiscountPercent, getEffectivePrice } from "@/lib/utils";
import type { ProductWithPrimaryImage } from "@/types";

const ADDING_MS = 350;
const ADDED_MS = 1200;

// A homepage-only visual treatment of the product card (18px radius, lift-
// on-hover, accent-colored Add to Cart hover) — deliberately not a change
// to components/product/ProductCard.tsx, which /shop, /search, and every
// category page also render and which must keep looking exactly as it did.
// Reuses the same cart/wishlist logic (useCart().addItem, WishlistButton)
// rather than duplicating it, only the layout and styling differ.
export function HomeProductCard({ product }: { product: ProductWithPrimaryImage }) {
  const { addItem } = useCart();
  const [status, setStatus] = useState<"idle" | "adding" | "added">("idle");
  const discountPercent = getDiscountPercent(product.actual_price, product.special_price);
  const outOfStock = product.stock <= 0;

  function handleAddToCart(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    setStatus("adding");
    setTimeout(() => {
      addItem({
        productId: product.id,
        slug: product.slug,
        name: product.name,
        price: getEffectivePrice(product),
        image: product.image,
        quantity: 1,
      });
      setStatus("added");
      setTimeout(() => setStatus("idle"), ADDED_MS);
    }, ADDING_MS);
  }

  return (
    <div className="group flex h-full flex-col rounded-[18px] border border-[var(--border)] bg-white p-4 shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-transform duration-200 ease-in-out hover:-translate-y-1">
      <div className="relative">
        <Link
          href={`/product/${product.slug}`}
          className="relative block aspect-square overflow-hidden rounded-[var(--radius-md)] bg-black/5"
        >
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              loading="lazy"
              sizes="(max-width: 640px) 50vw, 25vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-[var(--muted)]">
              No image
            </div>
          )}
        </Link>
        {discountPercent != null && (
          <span className="absolute top-2 left-2 rounded-full bg-[var(--color-accent)] px-2 py-0.5 text-[10px] font-semibold text-white">
            -{discountPercent}%
          </span>
        )}
        <div className="absolute top-2 right-2">
          <WishlistButton product={product} image={product.image} />
        </div>
      </div>

      <div className="flex flex-1 flex-col">
        {product.brand && (
          <p className="mt-3 text-[10px] font-semibold tracking-wide text-[var(--color-text-secondary)] uppercase">
            {product.brand}
          </p>
        )}
        <Link href={`/product/${product.slug}`}>
          <h3 className={`line-clamp-2 min-h-10 text-sm font-medium ${product.brand ? "mt-1" : "mt-3"}`}>
            {product.name}
          </h3>
        </Link>

        {product.reviewCount > 0 && (
          <div className="mt-1 flex items-center gap-1.5">
            <StarRating rating={product.avgRating} size="sm" />
            <span className="text-xs text-[var(--muted)]">({product.reviewCount})</span>
          </div>
        )}

        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="flex flex-wrap items-baseline gap-2">
            {product.special_price != null ? (
              <>
                <span className="text-xs text-[var(--muted)] line-through">
                  {formatPrice(product.actual_price)}
                </span>
                <span className="text-sm font-semibold text-[var(--color-error)]">
                  {formatPrice(product.special_price)}
                </span>
              </>
            ) : (
              <span className="text-sm font-semibold">{formatPrice(product.actual_price)}</span>
            )}
          </span>
          <span className="flex shrink-0 items-center gap-1.5 text-xs text-[var(--muted)]">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                outOfStock
                  ? "bg-[var(--color-discount)]"
                  : product.stock < 5
                    ? "bg-[var(--color-warning)]"
                    : "bg-[var(--color-success)]"
              }`}
              aria-hidden="true"
            />
            {outOfStock ? "Out of stock" : product.stock < 5 ? `Only ${product.stock} left` : "In Stock"}
          </span>
        </div>

        <div className="mt-auto pt-3">
          <button
            type="button"
            disabled={outOfStock || status !== "idle"}
            onClick={handleAddToCart}
            className="transition-brand flex w-full items-center justify-center gap-1.5 rounded-[12px] bg-[var(--color-btn-primary)] py-2 text-xs font-semibold text-white hover:bg-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {outOfStock ? (
              "Out of stock"
            ) : status === "adding" ? (
              "Adding…"
            ) : status === "added" ? (
              "Added ✓"
            ) : (
              <>
                <CartIcon className="h-4 w-4" />
                Add to Cart
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
