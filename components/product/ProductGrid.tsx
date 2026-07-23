import Link from "next/link";
import { ProductCard } from "./ProductCard";
import type { ProductWithPrimaryImage } from "@/types";

export function ProductGrid({
  products,
  emptyMessage = "No products in this category yet.",
}: {
  products: ProductWithPrimaryImage[];
  emptyMessage?: string;
}) {
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

  return (
    <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
