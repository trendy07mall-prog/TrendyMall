import Link from "next/link";
import Image from "next/image";
import { PriceDisplay } from "@/components/product/PriceDisplay";
import { WishlistButton } from "@/components/product/WishlistButton";
import { QuickAddButton } from "@/components/product/QuickAddButton";
import { StarRating } from "@/components/product/StarRating";
import type { ProductWithPrimaryImage } from "@/types";

export function ProductListItem({ product }: { product: ProductWithPrimaryImage }) {
  const inStock = product.stock > 0;

  return (
    <div className="group flex gap-4 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--color-card)] p-3 transition-[border-color,box-shadow] duration-200 ease-in-out hover:border-[var(--border-hover)] hover:shadow-[var(--shadow-card-hover)]">
      <div className="relative shrink-0">
        <Link
          href={`/product/${product.slug}`}
          className="relative block h-28 w-28 overflow-hidden rounded-[var(--radius-md)] bg-black/5"
        >
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              sizes="112px"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-[var(--muted)]">
              No image
            </div>
          )}
        </Link>
        <div className="absolute top-1.5 right-1.5">
          <WishlistButton product={product} image={product.image} />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between py-1">
        <div>
          <Link href={`/product/${product.slug}`}>
            <h3 className="line-clamp-2 text-sm font-medium">{product.name}</h3>
          </Link>
          {product.reviewCount > 0 && (
            <div className="mt-1 flex items-center gap-1.5">
              <StarRating rating={product.avgRating} size="sm" />
              <span className="text-xs text-[var(--muted)]">({product.reviewCount})</span>
            </div>
          )}
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <PriceDisplay
              actualPrice={product.actual_price}
              specialPrice={product.special_price}
              size="sm"
            />
            <span className={`text-xs ${inStock ? "text-[var(--muted)]" : "text-red-600"}`}>
              {inStock ? "In stock" : "Out of stock"}
            </span>
          </div>
          <div className="w-36 shrink-0">
            <QuickAddButton product={product} />
          </div>
        </div>
      </div>
    </div>
  );
}
