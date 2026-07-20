import type { Metadata } from "next";
import { getAllProducts } from "@/lib/data/products";
import { ProductGrid } from "@/components/product/ProductGrid";

export const metadata: Metadata = {
  title: "Shop All Accessories",
  description:
    "Browse the full TrendyMall catalogue of mobile phone accessories — earbuds, speakers, power banks, and headphones.",
};

export default async function ShopPage() {
  const products = await getAllProducts();

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-12">
      <h1 className="font-heading text-3xl font-bold tracking-tight">
        Shop All
      </h1>
      <p className="mt-2 text-[var(--muted)]">
        Every product we carry, in one place.
      </p>
      <div className="mt-8">
        <ProductGrid products={products} />
      </div>
    </div>
  );
}
