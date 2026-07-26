import Link from "next/link";
import Image from "next/image";
import { PriceDisplay } from "@/components/product/PriceDisplay";
import { WishlistButton } from "@/components/product/WishlistButton";
import { QuickAddButton } from "@/components/product/QuickAddButton";
import { QuickViewButton } from "@/components/product/QuickViewButton";
import { StarRating } from "@/components/product/StarRating";
import { getDiscountPercent } from "@/lib/utils";
import { getEstimatedDeliveryRange } from "@/lib/delivery";
import type { ProductWithPrimaryImage } from "@/types";

export function ProductCard({ product }: { product: ProductWithPrimaryImage }) {
  const discountPercent = getDiscountPercent(product.actual_price, product.special_price);
  const delivery = getEstimatedDeliveryRange();
  const stockDot =
    product.stock <= 0
      ? { color: "bg-[var(--color-discount)]", label: "Out of stock" }
      : product.stock < 5
        ? { color: "bg-[var(--color-warning)]", label: `Only ${product.stock} left` }
        : { color: "bg-[var(--color-success)]", label: "In Stock" };

  return (
    <div className="group transition-brand flex h-full flex-col rounded-[var(--radius-lg)] border border-[var(--border)] p-[var(--card-padding)] hover:-translate-y-1 hover:shadow-[var(--shadow-card-hover)]">
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
        {discountPercent != null && (
          <span className="absolute top-2 left-2 rounded-full bg-[var(--color-discount)] px-2 py-0.5 text-[10px] font-semibold text-white">
            -{discountPercent}%
          </span>
        )}
        <div className="absolute top-2 right-2">
          <WishlistButton product={product} image={product.image} />
        </div>
        <QuickViewButton slug={product.slug} />
      </div>

      <div className="flex flex-1 flex-col">
        {product.brand && (
          <p className="mt-3 text-[10px] font-semibold tracking-wide text-[var(--color-text-secondary)] uppercase">
            {product.brand}
          </p>
        )}
        <Link href={`/product/${product.slug}`}>
          <h3 className={`line-clamp-2 min-h-10 text-sm font-medium ${product.brand ? "mt-1" : "mt-3"}`}>
            {product.name}
          </h3>
        </Link>
        {product.reviewCount > 0 && (
          <div className="mt-1 flex items-center gap-1.5">
            <StarRating rating={product.avgRating} size="sm" />
            <span className="text-xs text-[var(--muted)]">({product.reviewCount})</span>
          </div>
        )}
        <div className="mt-1 flex items-center justify-between gap-2">
          <PriceDisplay
            actualPrice={product.actual_price}
            specialPrice={product.special_price}
            size="sm"
            showDiscountBadge={false}
          />
          <span className="flex shrink-0 items-center gap-1.5 text-xs text-[var(--muted)]">
            <span className={`h-1.5 w-1.5 rounded-full ${stockDot.color}`} aria-hidden="true" />
            {stockDot.label}
          </span>
        </div>
        <p className="mt-1 text-[11px] text-[var(--muted)]">{delivery.label}</p>

        <div className="mt-auto pt-3">
          <QuickAddButton product={product} />
        </div>
      </div>
    </div>
  );
}
