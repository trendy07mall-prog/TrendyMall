import { ProductCard } from "@/components/product/ProductCard";
import type { ProductWithPrimaryImage } from "@/types";

export function RelatedProducts({
  products,
}: {
  products: ProductWithPrimaryImage[];
}) {
  if (products.length === 0) return null;

  return (
    <section className="mt-16">
      <h2 className="font-heading text-xl font-bold tracking-tight">
        You may also like
      </h2>
      <div className="mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2">
        {products.map((product) => (
          <div
            key={product.id}
            className="w-44 shrink-0 snap-start sm:w-56"
          >
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
}
