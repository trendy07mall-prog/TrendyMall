import Link from "next/link";
import Image from "next/image";
import { PriceDisplay } from "@/components/product/PriceDisplay";
import { WishlistButton } from "@/components/product/WishlistButton";
import { QuickAddButton } from "@/components/product/QuickAddButton";
import { StarRating } from "@/components/product/StarRating";
import type { ProductWithPrimaryImage } from "@/types";

// Same three-tier stock treatment as ProductCard.tsx (grid view) — a
// literal #16a34a for "in stock" text so it passes contrast, not the
// shared --color-success token (used elsewhere for unrelated things).
const STOCK_STATE = {
  out: "text-[var(--color-discount)]",
  low: "text-[var(--color-warning)]",
  in: "text-[#16a34a]",
};

export function ProductListItem({
  product,
  variant = "default",
}: {
  product: ProductWithPrimaryImage;
  variant?: "default" | "shop";
}) {
  const stock =
    product.stock <= 0
      ? { color: STOCK_STATE.out, label: "Out of stock" }
      : product.stock < 5
        ? { color: STOCK_STATE.low, label: `Only ${product.stock} left` }
        : { color: STOCK_STATE.in, label: "In Stock" };

  return (
    <div
      className={`group flex gap-4 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--color-card)] p-3 transition-[border-color,box-shadow] duration-200 ease-in-out hover:shadow-[var(--shadow-card-hover)] ${
        variant === "shop" ? "hover:border-[var(--color-warning)]" : "hover:border-[var(--border-hover)]"
      }`}
    >
      <div className="relative shrink-0">
        <Link
          href={`/product/${product.slug}`}
          className="relative block aspect-square w-28 overflow-hidden rounded-[var(--radius-md)] bg-white"
        >
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              sizes="112px"
              className="object-contain transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-[var(--muted)]">
              No image
            </div>
          )}
        </Link>
        <div className="absolute top-1.5 right-1.5">
          <WishlistButton
            productId={product.id}
            slug={product.slug}
            name={product.name}
            price={product.special_price ?? product.actual_price}
            variantId={product.defaultVariantId || null}
            image={product.image}
          />
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
            <div>
              {product.hasMultiplePrices && (
                <p className="text-[10px] text-[var(--muted)]">Starting from</p>
              )}
              <PriceDisplay
                actualPrice={product.actual_price}
                specialPrice={product.special_price}
                size="sm"
              />
            </div>
            <span className={`text-xs font-medium ${stock.color}`}>{stock.label}</span>
          </div>
          <div className="w-36 shrink-0">
            <QuickAddButton product={product} variant={variant} />
          </div>
        </div>
      </div>
    </div>
  );
}
