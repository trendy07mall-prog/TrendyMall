import Link from "next/link";
import Image from "next/image";
import { PriceDisplay } from "@/components/product/PriceDisplay";
import { WishlistButton } from "@/components/product/WishlistButton";
import { QuickAddButton } from "@/components/product/QuickAddButton";
import { StarRating } from "@/components/product/StarRating";
import type { ProductWithPrimaryImage } from "@/types";

export function ProductCard({ product }: { product: ProductWithPrimaryImage }) {
  const inStock = product.stock > 0;

  return (
    <div className="group flex flex-col rounded-[var(--radius-lg)] border border-[var(--border)] p-3 transition-all duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-soft)]">
      <div className="relative">
        <Link
          href={`/product/${product.slug}`}
          className="relative block aspect-square overflow-hidden rounded-[var(--radius-md)] bg-black/5"
        >
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, 25vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-[var(--muted)]">
              No image
            </div>
          )}
        </Link>
        <div className="absolute top-2 right-2">
          <WishlistButton product={product} image={product.image} />
        </div>
      </div>

      <Link href={`/product/${product.slug}`}>
        <h3 className="mt-3 line-clamp-2 text-sm font-medium">{product.name}</h3>
      </Link>
      {product.reviewCount > 0 && (
        <div className="mt-1 flex items-center gap-1.5">
          <StarRating rating={product.avgRating} size="sm" />
          <span className="text-xs text-[var(--muted)]">({product.reviewCount})</span>
        </div>
      )}
      <div className="mt-1 flex items-center justify-between">
        <PriceDisplay
          actualPrice={product.actual_price}
          specialPrice={product.special_price}
          size="sm"
        />
        <span
          className={`text-xs ${inStock ? "text-[var(--muted)]" : "text-red-600"}`}
        >
          {inStock ? "In stock" : "Out of stock"}
        </span>
      </div>

      <div className="mt-3">
        <QuickAddButton product={product} />
      </div>
    </div>
  );
}
