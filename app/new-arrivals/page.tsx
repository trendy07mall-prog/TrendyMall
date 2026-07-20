import type { Metadata } from "next";
import { getNewArrivals } from "@/lib/data/products";
import { ProductGrid } from "@/components/product/ProductGrid";

export const metadata: Metadata = {
  title: "New Arrivals",
  description: "The latest mobile phone accessories added to TrendyMall.",
};

export default async function NewArrivalsPage() {
  const products = await getNewArrivals(24);

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-12">
      <h1 className="font-heading text-3xl font-bold tracking-tight">
        New Arrivals
      </h1>
      <p className="mt-2 text-[var(--muted)]">
        The newest additions to the TrendyMall catalogue.
      </p>
      <div className="mt-8">
        <ProductGrid products={products} emptyMessage="No new arrivals yet." />
      </div>
    </div>
  );
}
