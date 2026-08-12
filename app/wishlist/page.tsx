"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useWishlist } from "@/context/WishlistContext";
import { getWishlistProducts } from "@/lib/wishlist-display";
import { ProductGrid } from "@/components/product/ProductGrid";
import { RecentlyViewedSection } from "@/components/product/RecentlyViewedSection";
import { Skeleton } from "@/components/ui/Skeleton";
import type { ProductWithPrimaryImage } from "@/types";

export default function WishlistPage() {
  const { items, count } = useWishlist();
  const [products, setProducts] = useState<ProductWithPrimaryImage[]>([]);
  // Compared against `itemsKey` at render time (not a separate `loading`
  // boolean) so no setState happens synchronously in the effect body --
  // only inside the async `.then()` below, once results actually arrive
  // for that key. Same pattern app/cart/page.tsx already uses for its own
  // recommendations fetch.
  const [productsKey, setProductsKey] = useState<string | null>(null);

  const itemsKey = items.map((i) => i.productId).join(",");

  useEffect(() => {
    // No setState needed when the wishlist is empty -- that branch renders
    // the empty-wishlist state below and never reads `products`/`loading`.
    if (items.length === 0) return;
    let cancelled = false;
    getWishlistProducts(items.map((i) => i.productId)).then((results) => {
      if (cancelled) return;
      setProducts(results);
      setProductsKey(itemsKey);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey]);

  const excludeIds = items.map((i) => i.productId);
  const loading = productsKey !== itemsKey;

  if (items.length === 0) {
    return (
      <div className="mx-auto w-full max-w-[var(--container-width)] flex-1 px-6 py-[var(--section-padding-y)] max-sm:py-12">
        <div className="mx-auto flex w-full max-w-2xl flex-col items-center px-6 py-20 text-center">
          <p className="text-4xl" aria-hidden="true">
            ❤️
          </p>
          <h1 className="font-heading mt-4 text-2xl font-bold tracking-tight">
            Your Wishlist is Empty
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Save products you love and come back to them anytime.
          </p>
          <Link
            href="/shop"
            className="transition-brand mt-6 rounded-full bg-[var(--foreground)] px-6 py-3 text-sm font-medium text-white hover:opacity-85"
          >
            Explore Products
          </Link>
        </div>
        <RecentlyViewedSection excludeProductIds={[]} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[var(--container-width)] flex-1 px-6 py-[var(--section-padding-y)] max-sm:py-12">
      <div className="text-center sm:text-left">
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          ❤️ My Wishlist
        </h1>
        <p className="mt-2 text-[var(--muted)]">Your saved products</p>
      </div>

      <p className="mt-6 text-sm text-[var(--muted)]">
        {count} {count === 1 ? "item" : "items"}
      </p>

      <div className="mt-6">
        {loading ? (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => (
              <Skeleton key={item.productId} className="aspect-[3/4] w-full" />
            ))}
          </div>
        ) : (
          <ProductGrid products={products} />
        )}
      </div>

      <RecentlyViewedSection excludeProductIds={excludeIds} />
    </div>
  );
}
