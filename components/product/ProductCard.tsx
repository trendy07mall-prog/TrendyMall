import Link from "next/link";
import Image from "next/image";
import { PriceDisplay } from "@/components/product/PriceDisplay";
import { WishlistButton } from "@/components/product/WishlistButton";
import { QuickAddButton } from "@/components/product/QuickAddButton";
import { StarRating } from "@/components/product/StarRating";
import { CampaignCountdown } from "@/components/marketing/CampaignCountdown";
import { EyeIcon } from "@/components/ui/Icon";
import { getDiscountPercent } from "@/lib/utils";
import type { ProductWithPrimaryImage } from "@/types";

// Two INDEPENDENT fixed-height slots, not one shared box -- Slot A always
// sits directly under the image, Slot B always sits directly above the
// title, regardless of which one (or neither) has content for a given
// card. Collapsing them into a single reserved zone (the previous design)
// would let a campaign-only card's content drift toward the title and a
// brand-only card's content drift toward the image -- exactly the
// "shifting position" bug this is meant to prevent in the other direction.
// Slot A is single-line at every width -- 13px (closer to this card's own
// title/price scale, see CampaignCountdown's "sm" size) everywhere except
// below the sm breakpoint, where a bare "Ends in Nd HH:MM:SS" alone still
// needs one step smaller (11px) to fit a 2-column card's width at all.
// h-[18px] comfortably covers both sizes' line height. On the rare card
// where the countdown AND a campaign sold-count together still don't fit,
// the sold-count span (not the countdown) truncates -- see below -- rather
// than this wrapping or the countdown itself clipping.
const SLOT_A_HEIGHT = "h-[18px]";
const SLOT_B_HEIGHT = "h-[14px]";
// Rating + total-sold line above the button -- also always reserved (a
// product with neither renders this empty rather than letting the button
// creep up). Still responsive: below sm, a full 5-star rating + review
// count + a total-sold figure genuinely can't both fit on one line at a
// 2-column card's width no matter the font size (unlike Slot A, there's no
// more room to shrink into), so it wraps there (same flex-wrap-as-escape-
// valve already established on this card for the old price/stock row).
// items-start (see below) rather than items-center keeps the common
// single-line case flush against the price above it instead of floating
// centered in the reserved 2-line-worst-case height.
const RATING_ROW_HEIGHT = "h-[32px] sm:h-[18px]";

export function ProductCard({
  product,
  variant = "default",
  linkVariantId = null,
}: {
  product: ProductWithPrimaryImage;
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
  // THIS SPECIFIC VARIANT's own campaign membership -- unchanged from the
  // existing rule, just no longer feeding a component that also rendered
  // the campaign name (that's moved onto the image; see the glass bar
  // below).
  const hasCampaign = Boolean(product.campaignId && product.campaignName);
  const hasRating = product.reviewCount > 0;
  // Never fabricated -- product_sales_summary has no row at all for a
  // product with no reliably-tracked sales, which is null here, not 0.
  const hasTotalSold = product.totalUnitsSold != null && product.totalUnitsSold > 0;

  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--color-card)] transition-[border-color,box-shadow] duration-200 ease-in-out hover:border-[var(--border-hover)] hover:shadow-[var(--shadow-card-hover)]">
      <div className="relative">
        {/* Edge-to-edge, clipped to the card's own rounded corners by the
            outer div's overflow-hidden above. object-contain + white
            background so non-square product photos still sit cleanly.
            Zoom-on-hover (the Image's own scale transform) is untouched --
            the glass bar below is a sibling overlay, not part of the
            scaling element, so it stays crisp while the photo zooms
            beneath it. */}
        <Link href={productHref} className="relative block aspect-square overflow-hidden bg-white">
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
          {/* Campaign name moved here from the content area below -- only
              for a variant actually joined to an active campaign (same
              hasCampaign check the countdown in Slot A below uses). Same
              blur/opacity recipe already established for the site's other
              glass surfaces (header's scrolled state, the mobile bottom
              nav) -- backdrop-blur + backdrop-saturate-150 -- just a dark
              tint here instead of their light one, since this sits on a
              photo rather than the page background. */}
          {hasCampaign && (
            <div className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-black/45 px-2 py-1.5 backdrop-blur-md backdrop-saturate-150">
              <span aria-hidden="true" className="text-xs text-white">
                ⚡
              </span>
              <span className="truncate text-[11px] font-semibold text-white">{product.campaignName}</span>
            </div>
          )}
        </Link>
        {/* Smaller overlay badges: ~9-10px text, tight padding, stacked
            top-left with a small gap from the card edge. Same colors/
            conditions as before, unaffected by the glass bar above (that
            sits at the image's bottom edge, this stays top-left). */}
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

      {/* Top padding (pt-2) is deliberately tighter than the sides/bottom --
          Slot A sits right under the image and should read as anchored to
          it, not floating in the middle of a generic content-area inset;
          the fuller p-4-equivalent padding still applies left/right
          (unchanged card-edge margin) and at the bottom (see pb-3/sm:pb-4
          below). gap-1.5/pb-3 stay mobile-only tightened (sm: restores the
          original desktop rhythm) -- the narrower 2-column card doesn't
          need as much breathing room between rows as a wider desktop card
          does. */}
      <div className="flex flex-1 flex-col gap-1.5 px-4 pt-2 pb-3 sm:gap-2 sm:pb-4">
        {/* Slot A / Slot B / title grouped tightly on purpose (gap-1, not
            the gap-2 rhythm below) -- the title belongs immediately after
            Slot B with minimal spacing, while Slot A stays visually
            anchored near the image above it. Each slot is a fixed height
            rendered unconditionally, so neither ever collapses into the
            other or into the title -- a brand-only card's brand line sits
            at the exact same height as a campaign+brand card's brand line. */}
        <div className="flex flex-col gap-1">
          <div
            className={`flex ${SLOT_A_HEIGHT} flex-nowrap items-center justify-between gap-x-1 overflow-hidden text-[11px] whitespace-nowrap sm:text-[13px]`}
          >
            {hasCampaign && product.campaignEndAt && (
              <CampaignCountdown target={product.campaignEndAt} label="Ends in" size="sm" />
            )}
            {/* Campaign-attributed sold count -- deliberately the SAME
                soldCount field CampaignInfoBlock elsewhere reads (see
                getCampaignSoldCounts), just composed here without the name
                span that's moved to the glass bar. Distinct from
                totalUnitsSold in the rating row below -- a campaign
                product can show both at once. The countdown (shrink-0)
                always keeps its full text; this is what yields space
                (min-w-0 + truncate) on the rare narrow card where both
                can't fully fit, rather than the row wrapping or the
                countdown itself getting cut off mid-digit. */}
            {hasCampaign && product.soldCount != null && product.soldCount > 0 && (
              <span className="min-w-0 truncate text-[var(--muted)]">{product.soldCount} sold</span>
            )}
          </div>
          <p className={`${SLOT_B_HEIGHT} truncate text-[10px] leading-[14px] font-semibold tracking-wide text-[var(--color-text-secondary)] uppercase`}>
            {/* "No Brand" is a real, intentionally-created brand value --
                rendered exactly like any other, never hidden or specially
                treated. Only a genuinely null/empty brand leaves this
                empty (the height above is still reserved either way). */}
            {product.brand}
          </p>
          <Link href={productHref}>
            <h3 className="truncate text-sm leading-[1.45] font-medium">{product.name}</h3>
          </Link>
        </div>

        {/* "Starting from" removed -- the price itself is still the exact
            same effective price as before (lowest valid price across
            variants, from resolveCardDisplay/getCampaignFeaturedDisplayByProduct
            upstream), just shown as a plain price with no qualifier text.
            allowWrap is a safety net, not a design change: with the label
            gone this row is even less likely to need it, but a was-price +
            current-price pair that still doesn't fit at the narrowest
            mobile widths now wraps onto a second line instead of silently
            clipping against the card's own overflow-hidden. */}
        <PriceDisplay
          actualPrice={product.actual_price}
          specialPrice={product.special_price}
          size="sm"
          showDiscountBadge={false}
          allowWrap
        />

        {/* Rating (left) + lifetime total sold (right) -- always rendered,
            reserving its height, so the button below never creeps up on a
            card with neither. Two independently-real, independently-gated
            values on one line, never fabricated. Labeled "Sold" (not
            Slot A's "N sold" wording) mostly to keep it short -- the two
            numbers are already distinguished by position (this one sits
            right above the button, Slot A sits right under the image) as
            well as being visually distinct rows. This one is always >=
            Slot A's count, since campaign sales are a subset of a
            product's total sales, never counted separately from it. */}
        <div className={`flex ${RATING_ROW_HEIGHT} flex-wrap items-start justify-between gap-x-2 gap-y-0.5 sm:flex-nowrap`}>
          {hasRating ? (
            <div className="flex items-center gap-1">
              <StarRating rating={product.avgRating} size="sm" />
              <span className="text-[10px] text-[var(--muted)]">({product.reviewCount})</span>
            </div>
          ) : (
            <span />
          )}
          {hasTotalSold && (
            <span className="shrink-0 text-[10px] text-[var(--muted)]">{product.totalUnitsSold} Sold</span>
          )}
        </div>

        {/* Always bottom-pinned, regardless of how much optional content
            renders above -- mt-auto absorbs the remainder so the button
            lands at the same row position across every card in a grid row
            (CSS Grid stretches all cards in a row to equal height by
            default). No extra pt- here on top of that -- the flex
            container's own gap already provides the spacing rhythm; adding
            padding here on top of it was the redundant "leftover empty
            space before Add to Cart." */}
        <div className="mt-auto">
          <QuickAddButton product={product} variant={variant} />
        </div>
      </div>
    </div>
  );
}
