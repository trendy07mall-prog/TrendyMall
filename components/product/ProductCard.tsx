import Link from "next/link";
import Image from "next/image";
import { PriceDisplay } from "@/components/product/PriceDisplay";
import { WishlistButton } from "@/components/product/WishlistButton";
import { QuickAddButton } from "@/components/product/QuickAddButton";
import { StarRating } from "@/components/product/StarRating";
import { CampaignInfoBlock } from "@/components/marketing/CampaignInfoBlock";
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
            letterbox behind them. "shop" variant insets slightly less
            (92%, true 1:1 aspect-square rather than a fixed height) so the
            image reads as the card's primary focus. */}
        <Link
          href={`/product/${product.slug}`}
          className={`relative mx-auto block aspect-square overflow-hidden rounded-[14px] bg-white ${
            isShop ? "w-[92%]" : "w-5/6"
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
          {product.badgeLabel && (
            <span className="rounded-full bg-[var(--color-warning)] px-[10px] py-[3px] text-[11px] font-semibold text-white">
              {product.badgeLabel}
            </span>
          )}
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

      <div className={`flex flex-1 flex-col ${isShop ? "mt-2.5 gap-2" : hideDeliveryEstimate ? "mt-3" : "mt-3 gap-3"}`}>
        {product.campaignId && product.campaignName && (
          <CampaignInfoBlock
            campaignName={product.campaignName}
            campaignEndAt={product.campaignEndAt}
            soldCount={product.soldCount}
            compact
          />
        )}
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

        {isShop ? (
          // Compact redesign: price only, no stock pill and no delivery
          // line in the card itself -- stock still fully blocks Add to
          // Cart below (QuickAddButton reads product.stock directly, not
          // anything from this component), this is display-only.
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
        ) : (
          <div className={hideDeliveryEstimate ? "mt-2" : ""}>
            {/* shrink-0 on BOTH sides (not min-w-0 on the price side -- that
                lets the price box get compressed smaller than its own text,
                which visually collides with the stock badge instead of
                wrapping) is what keeps this row on one line, at full size,
                at every price/stock combination and every grid density this
                card renders at (New Arrivals' wider cards down to /shop's
                narrower 4-up columns) -- gap-1 is deliberately tighter than
                the site's usual gap-2 for the same reason. */}
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
            {!hideDeliveryEstimate && <p className="mt-1 text-[11px] text-[var(--muted)]">{delivery.label}</p>}
          </div>
        )}

        {/* Always bottom-pinned, regardless of variant/hideDeliveryEstimate --
            the amount of optional content above (campaign block, brand,
            rating, delivery line) varies per card, but mt-auto absorbs all
            of it so the button lands at the same row position across every
            card in a grid row (CSS Grid stretches all cards in a row to
            equal height by default). */}
        <div className="mt-auto">
          <QuickAddButton product={product} variant={variant} />
        </div>
      </div>
    </div>
  );
}
