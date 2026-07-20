import type { Metadata } from "next";
import { searchProducts } from "@/lib/data/products";
import { ProductGrid } from "@/components/product/ProductGrid";

export const metadata: Metadata = {
  title: "Search Results",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const products = q ? await searchProducts(q) : [];

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-12">
      <h1 className="font-heading text-2xl font-bold tracking-tight">
        {q ? `Search results for "${q}"` : "Search"}
      </h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        {products.length} {products.length === 1 ? "product" : "products"} found
      </p>
      <div className="mt-8">
        <ProductGrid
          products={products}
          emptyMessage="No matching products found."
        />
      </div>
    </div>
  );
}
