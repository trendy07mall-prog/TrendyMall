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

export function ProductCard({
  product,
  hideDeliveryEstimate = false,
  variant = "default",
}: {
  product: ProductWithPrimaryImage;
  // Homepage-only (New Arrivals) — every other render site (/shop, category,
  // /search, Related Products) keeps the delivery estimate and the original
  // spacing rhythm exactly as-is. The tighter gaps below only apply once
  // this is true, since they only make sense with the date line actually
  // gone, not as a general site-wide spacing change.
  hideDeliveryEstimate?: boolean;
  // "shop" is the /shop-page redesign's bigger card treatment (larger
  // image, larger price, stacked price/stock row) — opt-in only, since
  // this component also renders on /category, /search, Related Products,
  // and the homepage, none of which asked for the redesign.
  variant?: "default" | "shop";
}) {
  const discountPercent = getDiscountPercent(product.actual_price, product.special_price);
  const delivery = getEstimatedDeliveryRange();
  const stock =
    product.stock <= 0
      ? { ...STOCK_STATE.out, label: "Out of stock" }
      : product.stock < 5
        ? { ...STOCK_STATE.low, label: `Only ${product.stock} left` }
        : { ...STOCK_STATE.in, label: "In Stock" };
  const isShop = variant === "shop";

  return (
    <div
      className={`group flex h-full flex-col rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--color-card)] p-4 transition-[border-color,box-shadow] duration-200 ease-in-out hover:shadow-[var(--shadow-card-hover)] ${
        isShop ? "hover:border-[var(--color-warning)]" : "hover:border-[var(--border-hover)]"
      }`}
    >
      <div className="relative">
        {/* Inset ~83% of the card's content width (not edge-to-edge) —
            a centered, "framed" thumbnail rather than a full-bleed image.
            object-contain (not cover) + a white background so non-square
            product photos sit cleanly without a cropped edge or a grey
            letterbox behind them. "shop" variant sizes the frame to a
            fixed 200px height instead of aspect-square, per the redesign
            spec. */}
        <Link
          href={`/product/${product.slug}`}
          className={`relative mx-auto block overflow-hidden rounded-[14px] bg-white ${
            isShop ? "h-[200px] w-[95%]" : "aspect-square w-5/6"
          }`}
        >
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              loading="lazy"
              sizes="(max-width: 640px) 42vw, 21vw"
              className={`object-contain transition-transform duration-300 ${
                isShop ? "group-hover:scale-[1.06]" : "group-hover:scale-[1.04]"
              }`}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-[var(--muted)]">
              No image
            </div>
          )}
        </Link>
        <div className="absolute top-2 left-2 flex flex-col items-start gap-1">
          {discountPercent != null && (
            <span
              className={`flex items-center rounded-full bg-[var(--color-discount)] font-semibold text-white ${
                isShop ? "h-9 px-3 text-sm" : "h-[30px] px-[10px] text-[13px]"
              }`}
            >
              -{discountPercent}%
            </span>
          )}
          {product.tags.slice(0, 2).map((tag) => (
            <span
              key={tag.slug}
              className="rounded-full bg-[var(--foreground)] px-[10px] py-[3px] text-[11px] font-semibold text-white"
            >
              {tag.name}
            </span>
          ))}
        </div>
        <div className="absolute top-2 right-2">
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

      <div className={`mt-3 flex flex-1 flex-col ${hideDeliveryEstimate ? "" : "gap-3"}`}>
        <div>
          {product.brand && (
            <p className="text-[10px] font-semibold tracking-wide text-[var(--color-text-secondary)] uppercase">
              {product.brand}
            </p>
          )}
          <Link href={`/product/${product.slug}`}>
            <h3
              className={`line-clamp-2 leading-[1.45] font-medium ${product.brand ? "mt-1" : ""} ${
                isShop ? "min-h-12 text-base" : "min-h-10 text-sm"
              }`}
            >
              {product.name}
            </h3>
          </Link>
        </div>

        {product.reviewCount > 0 && (
          <div className={`flex items-center gap-1.5 ${hideDeliveryEstimate ? "mt-2" : ""}`}>
            <StarRating rating={product.avgRating} size="sm" />
            <span className="text-xs text-[var(--muted)]">({product.reviewCount})</span>
          </div>
        )}

        <div className={hideDeliveryEstimate ? "mt-2" : ""}>
          {isShop ? (
            // "shop" stacks price above the stock pill instead of forcing
            // them onto one row -- at 34px the price alone is wider than
            // "sm"'s whole row budget, so there's no narrow-column fit to
            // preserve here the way the default variant's row has to.
            <div className="flex flex-col gap-2">
              <div>
                {product.hasMultiplePrices && (
                  <p className="text-[10px] text-[var(--muted)]">Starting from</p>
                )}
                <PriceDisplay
                  actualPrice={product.actual_price}
                  specialPrice={product.special_price}
                  size="lg"
                  showDiscountBadge={false}
                />
              </div>
              <span
                className={`inline-flex w-fit items-center gap-1.5 rounded-full bg-[#16a34a]/10 px-2.5 py-1 text-[11px] font-medium whitespace-nowrap ${stock.text}`}
              >
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${stock.dot}`} aria-hidden="true" />
                {stock.label}
              </span>
            </div>
          ) : (
            // shrink-0 on BOTH sides (not min-w-0 on the price side -- that
            // lets the price box get compressed smaller than its own text,
            // which visually collides with the stock badge instead of
            // wrapping) is what keeps this row on one line, at full size,
            // at every price/stock combination and every grid density this
            // card renders at (New Arrivals' wider cards down to /shop's
            // narrower 4-up columns) -- gap-1 is deliberately tighter than
            // the site's usual gap-2 for the same reason.
            <div className="flex items-center justify-between gap-1">
              <div className="shrink-0">
                {product.hasMultiplePrices && (
                  <p className="text-[10px] text-[var(--muted)]">Starting from</p>
                )}
                <PriceDisplay
                  actualPrice={product.actual_price}
                  specialPrice={product.special_price}
                  size="sm"
                  showDiscountBadge={false}
                />
              </div>
              <span
                className={`flex shrink-0 items-center gap-0.5 text-[11px] font-medium whitespace-nowrap ${stock.text}`}
              >
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${stock.dot}`} aria-hidden="true" />
                {stock.label}
              </span>
            </div>
          )}
          {!hideDeliveryEstimate && <p className="mt-1 text-[11px] text-[var(--muted)]">{delivery.label}</p>}
        </div>

        <div className={hideDeliveryEstimate ? "mt-3" : "mt-auto"}>
          <QuickAddButton product={product} variant={variant} />
        </div>
      </div>
    </div>
  );
}
