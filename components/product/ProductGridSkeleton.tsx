import { ProductCardSkeleton } from "@/components/product/ProductCardSkeleton";

export function ProductGridSkeleton({
  count = 8,
  variant = "default",
}: {
  count?: number;
  variant?: "default" | "shop";
}) {
  return (
    <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 ${variant === "shop" ? "gap-6" : "gap-5"}`}>
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} variant={variant} />
      ))}
    </div>
  );
}
