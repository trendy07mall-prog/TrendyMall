"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useWishlist } from "@/context/WishlistContext";
import { getWishlistProducts } from "@/lib/wishlist-display";
import { ProductGrid } from "@/components/product/ProductGrid";
import { Skeleton } from "@/components/ui/Skeleton";
import type { ProductWithPrimaryImage } from "@/types";

// Ported from app/wishlist/page.tsx's exact data-fetching pattern (same
// useWishlist()/getWishlistProducts() calls, same ProductGrid renderer —
// so price/sale-badge/stock-pill/no-fake-ratings all come free, nothing
// reimplemented). Differences are purely because this renders inside the
// account shell's narrower content column: no RecentlyViewedSection (that
// carousel assumes full page width) and a smaller empty-state treatment
// matching the account area's other empty states (e.g. Orders').
export default function AccountWishlistPage() {
  const { items, count } = useWishlist();
  const [products, setProducts] = useState<ProductWithPrimaryImage[]>([]);
  const [productsKey, setProductsKey] = useState<string | null>(null);

  const itemsKey = items.map((i) => i.productId).join(",");

  useEffect(() => {
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

  const loading = productsKey !== itemsKey;

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold tracking-tight">Wishlist</h1>

      {items.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-[var(--radius-card)] border border-[var(--border)] py-16 text-center">
          <p className="text-sm text-[var(--muted)]">Save products you love and come back to them anytime.</p>
          <Link
            href="/shop"
            className="transition-brand rounded-full bg-[var(--foreground)] px-5 py-2 text-sm font-medium text-white hover:bg-[var(--color-btn-hover)]"
          >
            Explore Products
          </Link>
        </div>
      ) : (
        <>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {count} {count === 1 ? "item" : "items"}
          </p>
          <div className="mt-6">
            {loading ? (
              <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
                {items.map((item) => (
                  <Skeleton key={item.productId} className="aspect-[3/4] w-full" />
                ))}
              </div>
            ) : (
              <ProductGrid products={products} />
            )}
          </div>
        </>
      )}
    </div>
  );
}
