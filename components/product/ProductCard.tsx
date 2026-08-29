import Link from "next/link";
import Image from "next/image";
import { PriceDisplay } from "@/components/product/PriceDisplay";
import { WishlistButton } from "@/components/product/WishlistButton";
import { QuickAddButton } from "@/components/product/QuickAddButton";
import { StarRating } from "@/components/product/StarRating";
import { CampaignInfoBlock } from "@/components/marketing/CampaignInfoBlock";
import { EyeIcon } from "@/components/ui/Icon";
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

// The reserved meta zone above the title (campaign strip / brand / rating)
// is a fixed height regardless of which of those three are present, so
// every title in a row starts at the identical vertical position instead of
// climbing up to fill whatever empty slots collapsed. Sized (measured, not
// guessed) to fit the real worst case: an admin-authored campaign name long
// enough to wrap the "⚡ name" / "Ends in HH:MM:SS" countdown across its own
// flex-wrap lines (unchanged), stacked above a brand line and a rating
// line. A card with fewer (or none) just leaves the remainder of this box
// blank rather than shrinking it.
//
// Responsive, and in the OPPOSITE direction from the naive assumption: this
// grid is 2 columns below sm, 3 from sm, 4 from lg (ProductGrid.tsx). The
// narrower 2-column cards wrap that same worst-case content across MORE
// lines than the 3-/4-column ones do, not fewer -- measured 90px at every
// width under 640px, vs. 70px at 640px and up (sm and lg cards happen to
// wrap identically, so one breakpoint covers both). Using the desktop
// number everywhere would clip the campaign block specifically on mobile,
// which is the one place a screenshot pass is likely to catch it.
const META_ZONE_HEIGHT = "h-[92px] sm:h-[72px]";

export function ProductCard({
  product,
  hideDeliveryEstimate = false,
  variant = "default",
  linkVariantId = null,
}: {
  product: ProductWithPrimaryImage;
  // Homepage-only (New Arrivals) — every other render site (/shop, category,
  // /search, Related Products) keeps the delivery estimate and the original
  // spacing rhythm exactly as-is. The tighter gaps below only apply once
  // this is true, since they only make sense with the date line actually
  // gone, not as a general site-wide spacing change.
  hideDeliveryEstimate?: boolean;
  // Only affects QuickAddButton's own button styling now (its taller/
  // rounder /shop treatment) -- the card itself renders identically
  // regardless of variant, so every grid this component appears in stays
  // visually consistent (this mirrors PriceDisplay's own "sm" being the one
  // shared size for every grid, with no separate bigger variant anymore).
  variant?: "default" | "shop";
  // Set ONLY by campaign-context callers (ActiveCampaignSections.tsx,
  // /campaign/[slug] via ProductGrid's linkToFeaturedVariant) to this
  // product's campaign-featured variant id -- appends ?variant= so the PDP
  // opens pre-selected on the exact variant this card is showing a price
  // for, instead of landing on whatever the product's own default variant
  // happens to be. Every other render site leaves this null/omitted, so
  // its product links are byte-for-byte unchanged.
  linkVariantId?: string | null;
}) {
  const productHref = linkVariantId
    ? `/product/${product.slug}?variant=${linkVariantId}`
    : `/product/${product.slug}`;
  const discountPercent = getDiscountPercent(product.actual_price, product.special_price);
  const delivery = getEstimatedDeliveryRange();
  const stock =
    product.stock <= 0
      ? { ...STOCK_STATE.out, label: "Out of stock" }
      : product.stock < 5
        ? { ...STOCK_STATE.low, label: `Only ${product.stock} left` }
        : { ...STOCK_STATE.in, label: "In Stock" };
  const hasCampaign = Boolean(product.campaignId && product.campaignName);
  const hasRating = product.reviewCount > 0;

  return (
    <div className="group flex h-full flex-col rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--color-card)] transition-[border-color,box-shadow] duration-200 ease-in-out hover:border-[var(--border-hover)] hover:shadow-[var(--shadow-card-hover)]">
      <div className="relative">
        {/* Edge-to-edge: flush to the card's left/right/top edges, clipped
            to rounded-t on THIS element (matching the card's own radius)
            rather than overflow-hidden on the outer card div -- that was
            tried first, but it also silently clipped anything else in the
            card that overflowed horizontally (the campaign countdown's
            mono timer text at 320px), hiding real content instead of just
            rounding the image. object-contain + white background
            (unchanged) so non-square product photos still sit cleanly with
            no cropped edge -- only the surrounding white gutter is gone,
            not the image's own fit behavior. Zoom-on-hover is untouched. */}
        <Link
          href={productHref}
          className="relative block aspect-square overflow-hidden rounded-t-[var(--radius-card)] bg-white"
        >
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              loading="lazy"
              sizes="(max-width: 640px) 42vw, 21vw"
              className="object-contain transition-transform duration-300 group-hover:scale-[1.04]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-[var(--muted)]">
              No image
            </div>
          )}
        </Link>
        {/* Smaller overlay badges: ~9-10px text, tight padding, stacked
            top-left with a small gap from the (now true) card edge. Same
            colors/conditions as before, sizing only. */}
        <div className="absolute top-2 left-2 flex flex-col items-start gap-1">
          {product.badgeLabel && (
            <span className="rounded-full bg-[var(--color-warning)] px-2 py-[2px] text-[9px] font-semibold text-white">
              {product.badgeLabel}
            </span>
          )}
          {discountPercent != null && (
            <span className="flex items-center rounded-full bg-[var(--color-discount)] px-2 py-[2px] text-[9px] font-semibold text-white">
              -{discountPercent}%
            </span>
          )}
          {product.tags.slice(0, 2).map((tag) => (
            <span
              key={tag.slug}
              className="rounded-full bg-[var(--foreground)] px-2 py-[2px] text-[9px] font-semibold text-white"
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
        {/* Desktop-hover-only quick view -- no quick-view modal exists
            anywhere in the codebase, so this links straight to the product
            page per the fallback. hidden by default (mobile has no hover
            state to reveal it on), opacity-0 + group-hover on sm+ so it
            never appears in the card's resting state. Sits opposite the
            WishlistButton corner and well clear of QuickAddButton, which
            is pinned to the bottom of the card body below (mt-auto), not
            inside this image wrapper -- no hitbox overlap. */}
        <Link
          href={productHref}
          aria-label={`Quick view ${product.name}`}
          className="absolute right-2 bottom-2 hidden h-9 w-9 items-center justify-center rounded-full bg-white text-[var(--foreground)] opacity-0 shadow-[var(--shadow-card)] transition-opacity duration-200 group-hover:opacity-100 sm:flex hover:bg-[var(--foreground)] hover:text-white"
        >
          <EyeIcon className="h-4 w-4" />
        </Link>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        {/* Reserved meta zone -- fixed height regardless of how many of
            campaign/brand/rating are present (0 to 3), so the title below
            always starts at the same offset across every card in a row.
            Top-aligned (not centered): a card with only a brand shows it
            flush under the image with blank space below, matching a card
            with campaign+brand+rating stacked, rather than floating its
            one line in the middle of the reserved box. */}
        <div className={`flex ${META_ZONE_HEIGHT} flex-col justify-start gap-0.5 overflow-hidden`}>
          {hasCampaign && (
            <CampaignInfoBlock
              campaignName={product.campaignName!}
              campaignEndAt={product.campaignEndAt}
              soldCount={product.soldCount}
              compact
            />
          )}
          {product.brand && (
            <p className="truncate text-[10px] leading-[14px] font-semibold tracking-wide text-[var(--color-text-secondary)] uppercase">
              {product.brand}
            </p>
          )}
          {hasRating && (
            <div className="flex h-[14px] items-center gap-1.5">
              <StarRating rating={product.avgRating} size="sm" />
              <span className="text-[10px] leading-[14px] text-[var(--muted)]">({product.reviewCount})</span>
            </div>
          )}
        </div>

        <Link href={productHref}>
          <h3 className="line-clamp-2 min-h-10 text-sm leading-[1.45] font-medium">{product.name}</h3>
        </Link>

        <div>
          {/* shrink-0 on BOTH sides (not min-w-0 on the price side -- that
              lets the price box get compressed smaller than its own text,
              which visually collides with the stock badge instead of
              wrapping) keeps this row at full, un-truncated size at every
              price/stock combination -- gap-1 is deliberately tighter than
              the site's usual gap-2 for the same reason. flex-wrap (base
              only, sm:flex-nowrap above) is the overflow escape valve for
              the one case shrink-0 can't otherwise handle: a 2-column
              grid at ~320px, where price + stock badge combined can
              genuinely exceed the card's content width -- CSS only wraps
              when a row actually doesn't fit, so this is a no-op at every
              width/grid density that already had room (New Arrivals'
              wider cards, /shop's 4-up columns, sm+ grids). */}
          <div className="flex flex-wrap items-center justify-between gap-x-1 gap-y-0.5 sm:flex-nowrap">
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

        {/* Always bottom-pinned, regardless of how much optional content
            renders above (meta zone is now fixed-height too, but the title/
            price block can still vary a little) -- mt-auto absorbs the
            remainder so the button lands at the same row position across
            every card in a grid row (CSS Grid stretches all cards in a row
            to equal height by default). */}
        <div className="mt-auto pt-1">
          <QuickAddButton product={product} variant={variant} />
        </div>
      </div>
    </div>
  );
}
