"use client";

import Link from "next/link";
import { ProductCard } from "./ProductCard";
import { ProductListItem } from "./ProductListItem";
import { useViewMode } from "@/context/ViewModeContext";
import type { ProductWithPrimaryImage } from "@/types";

export function ProductGrid({
  products,
  emptyMessage = "No products in this category yet.",
  variant = "default",
  linkToFeaturedVariant = false,
  unavailableLabel = null,
}: {
  products: ProductWithPrimaryImage[];
  emptyMessage?: string;
  // Page-level reason this grid's products can't be bought right now,
  // forwarded to both view modes' cards -- see QuickAddButton's own prop
  // comment. Only /campaign/[slug] sets it, for a campaign that hasn't
  // started yet (or has ended); every other grid omits it and keeps a
  // normal, enabled Add to Cart.
  unavailableLabel?: string | null;
  // "shop" opts into the /shop redesign's bigger cards -- every other
  // caller (category, search, related products) omits this and keeps
  // today's rendering untouched.
  variant?: "default" | "shop";
  // /campaign/[slug] only -- each product here already carries its own
  // campaign-featured variant id as defaultVariantId (see
  // applyCampaignFeaturedDisplay in lib/data/campaigns.ts). Every other
  // caller (Shop, category, search) omits this, so their product links
  // are byte-for-byte unchanged.
  linkToFeaturedVariant?: boolean;
}) {
  const { view } = useViewMode();

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] px-6 py-16 text-center">
        <p className="text-sm text-[var(--muted)]">{emptyMessage}</p>
        <Link
          href="/shop"
          className="rounded-full bg-[var(--foreground)] px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-85"
        >
          Continue Shopping
        </Link>
      </div>
    );
  }

  if (view === "list") {
    return (
      <div className="flex flex-col gap-4">
        {products.map((product) => (
          <ProductListItem
            key={product.id}
            product={product}
            variant={variant}
            linkVariantId={linkToFeaturedVariant ? product.defaultVariantId : null}
            unavailableLabel={unavailableLabel}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 ${variant === "shop" ? "gap-6" : "gap-5"}`}>
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          variant={variant}
          linkVariantId={linkToFeaturedVariant ? product.defaultVariantId : null}
          unavailableLabel={unavailableLabel}
        />
      ))}
    </div>
  );
}
