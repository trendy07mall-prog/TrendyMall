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
}: {
  products: ProductWithPrimaryImage[];
  emptyMessage?: string;
  // "shop" opts into the /shop redesign's bigger cards -- every other
  // caller (category, search, related products) omits this and keeps
  // today's rendering untouched.
  variant?: "default" | "shop";
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
          <ProductListItem key={product.id} product={product} variant={variant} />
        ))}
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 ${variant === "shop" ? "gap-6" : "gap-5"}`}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} variant={variant} />
      ))}
    </div>
  );
}
