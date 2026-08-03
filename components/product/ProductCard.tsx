import Link from "next/link";
import Image from "next/image";
import { PriceDisplay } from "@/components/product/PriceDisplay";
import { WishlistButton } from "@/components/product/WishlistButton";
import { QuickAddButton } from "@/components/product/QuickAddButton";
import { StarRating } from "@/components/product/StarRating";
import { getDiscountPercent } from "@/lib/utils";
import { getEstimatedDeliveryRange } from "@/lib/delivery";
import type { ProductWithPrimaryImage } from "@/types";

// Stock text color is scoped to this component (a literal #16A34A, not the
// shared --color-success token) — that token is used elsewhere in the app
// (order badges, etc.) and this darker shade is specifically so the "In
// Stock" text itself (not just the small dot) passes contrast as text.
const STOCK_STATE = {
  out: { dot: "bg-[var(--color-discount)]", text: "text-[var(--color-discount)]" },
  low: { dot: "bg-[var(--color-warning)]", text: "text-[var(--color-warning)]" },
  in: { dot: "bg-[#16a34a]", text: "text-[#16a34a]" },
};

export function ProductCard({ product }: { product: ProductWithPrimaryImage }) {
  const discountPercent = getDiscountPercent(product.actual_price, product.special_price);
  const delivery = getEstimatedDeliveryRange();
  const stock =
    product.stock <= 0
      ? { ...STOCK_STATE.out, label: "Out of stock" }
      : product.stock < 5
        ? { ...STOCK_STATE.low, label: `Only ${product.stock} left` }
        : { ...STOCK_STATE.in, label: "In Stock" };

  return (
    <div className="group flex h-full flex-col rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--color-card)] p-4 transition-[border-color,box-shadow] duration-200 ease-in-out hover:border-[var(--border-hover)] hover:shadow-[var(--shadow-card-hover)]">
      <div className="relative">
        {/* Inset ~74% of the card's content width (not edge-to-edge) —
            a centered, "framed" thumbnail rather than a full-bleed image. */}
        <Link
          href={`/product/${product.slug}`}
          className="relative mx-auto block aspect-square w-[74%] overflow-hidden rounded-[var(--radius-md)] bg-black/5"
        >
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              loading="lazy"
              sizes="(max-width: 640px) 37vw, 19vw"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-[var(--muted)]">
              No image
            </div>
          )}
        </Link>
        {discountPercent != null && (
          <span className="absolute top-2 left-2 flex h-[30px] items-center rounded-full bg-[var(--color-discount)] px-[10px] text-[13px] font-semibold text-white">
            -{discountPercent}%
          </span>
        )}
        <div className="absolute top-2 right-2">
          <WishlistButton product={product} image={product.image} />
        </div>
      </div>

      <div className="mt-3 flex flex-1 flex-col gap-3">
        <div>
          {product.brand && (
            <p className="text-[10px] font-semibold tracking-wide text-[var(--color-text-secondary)] uppercase">
              {product.brand}
            </p>
          )}
          <Link href={`/product/${product.slug}`}>
            <h3 className={`line-clamp-2 min-h-10 text-sm leading-[1.45] font-medium ${product.brand ? "mt-1" : ""}`}>
              {product.name}
            </h3>
          </Link>
        </div>

        {product.reviewCount > 0 && (
          <div className="flex items-center gap-1.5">
            <StarRating rating={product.avgRating} size="sm" />
            <span className="text-xs text-[var(--muted)]">({product.reviewCount})</span>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between gap-2">
            <PriceDisplay
              actualPrice={product.actual_price}
              specialPrice={product.special_price}
              size="sm"
              showDiscountBadge={false}
            />
            <span className={`flex shrink-0 items-center gap-1.5 text-xs font-medium ${stock.text}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${stock.dot}`} aria-hidden="true" />
              {stock.label}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-[var(--muted)]">{delivery.label}</p>
        </div>

        <div className="mt-auto">
          <QuickAddButton product={product} />
        </div>
      </div>
    </div>
  );
}
