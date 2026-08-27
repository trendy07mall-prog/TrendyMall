"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ProductGalleryWithVariants } from "@/components/product/ProductGalleryWithVariants";
import { AttributeCard } from "@/components/product/AttributeCard";
import { AttributeSelector } from "@/components/product/AttributeSelector";
import { PriceDisplay } from "@/components/product/PriceDisplay";
import { AddToCartForm } from "@/components/product/AddToCartForm";
import { BuyNowButton } from "@/components/product/BuyNowButton";
import { WishlistButton } from "@/components/product/WishlistButton";
import { WhatsAppOrderButton } from "@/components/product/WhatsAppOrderButton";
import { ShareButtons } from "@/components/product/ShareButtons";
import { NotifyMeForm } from "@/components/product/NotifyMeForm";
import { WhatsInBox } from "@/components/product/WhatsInBox";
import { TrustBadges } from "@/components/marketing/TrustBadges";
import { CampaignInfoBlock } from "@/components/marketing/CampaignInfoBlock";
import { ProductTabs } from "@/components/product/ProductTabs";
import { StarRating } from "@/components/product/StarRating";
import { DeliveryInfoCard } from "@/components/product/DeliveryInfoCard";
import { ProductHighlights } from "@/components/product/ProductHighlights";
import { ProductTitleClamp } from "@/components/product/ProductTitleClamp";
import { FloatingPurchaseBar } from "@/components/product/FloatingPurchaseBar";
import { getVariantPrice, pickWinningVariant, resolveEffectivePriceBand } from "@/lib/utils";
import { getEstimatedDeliveryRange } from "@/lib/delivery";
import { trackConversion } from "@/lib/analytics/track";
import { VariantSwatches, type ColorSwatchOption } from "@/components/product/VariantSwatches";
import type { ProductVariantWithImages } from "@/lib/data/products";
import type { Attribute, AttributeSelection, AttributeValue, Product, ProductRatingSummary } from "@/types";
import type { ReviewWithReviewerName } from "@/lib/reviews";
import type { DisplaySpec } from "@/lib/data/spec-templates";

function normalizeColor(name: string | null): string {
  return (name ?? "").trim().toLowerCase();
}

// Some variants' color_name has extra "- Capacity - Connector" text baked
// into it (an admin data-entry slip -- the full variant descriptor typed
// into the color field instead of just the color, e.g. "White - 5000 mah -
// Lighting"), so the Colour row would otherwise print that whole string
// instead of the actual color. Display only the leading segment. The
// matching/dedup key (normalizeColor, above) still hashes the FULL raw
// name completely unchanged -- this only touches what text is shown, never
// which variants a color click resolves to.
function displayColorName(name: string): string {
  const [first] = name.split(/\s+-\s+/);
  return first.trim() || name;
}

export function ProductPurchaseSection({
  product,
  images,
  variants,
  attributes,
  categoryName,
  specs,
  reviews,
  ratingSummary,
  reviewState,
  tags,
  inZoneRate,
  outsideZoneRate,
}: {
  product: Product;
  images: string[];
  variants: ProductVariantWithImages[];
  attributes: { attribute: Attribute; values: AttributeValue[] }[];
  categoryName: string;
  specs: DisplaySpec[];
  reviews: ReviewWithReviewerName[];
  ratingSummary: ProductRatingSummary | null;
  reviewState: "can_review" | "already_reviewed" | "not_logged_in";
  tags: { name: string; slug: string }[];
  inZoneRate: number;
  outsideZoneRate: number;
}) {
  // ?variant=<id> deep link -- set by campaign-context product cards
  // (ActiveCampaignSections.tsx, /campaign/[slug]'s ProductGrid) so the PDP
  // opens on the exact campaign-featured variant the card showed a price
  // for, instead of this product's own default. Read once here; validated
  // against this product's real variants inside defaultDimensions() below,
  // same place pickWinningVariant's own fallback already lives.
  const variantIdParam = useSearchParams().get("variant");

  // Color options are every distinct color across this product's variants
  // (deduped -- two variants can share a color, e.g. the same white in two
  // capacities, and must render as ONE swatch, not two identical ones). A
  // variant with no color at all (the invisible "default" variant every
  // single-option product now gets) never contributes a swatch.
  const colorOptions: { key: string; name: string; hex: string }[] = [];
  const seenColorKeys = new Set<string>();
  for (const v of variants) {
    if (!v.color_name || !v.color_hex) continue;
    const key = normalizeColor(v.color_name);
    if (!seenColorKeys.has(key)) {
      seenColorKeys.add(key);
      colorOptions.push({ key, name: displayColorName(v.color_name), hex: v.color_hex });
    }
  }

  // An attribute only participates in variant matching if at least one of
  // this product's variants is actually linked to one of its values --
  // every other attribute (the common case, every product untouched by
  // this feature) stays exactly what it's always been: a required
  // reference-only choice with zero effect on price/stock/SKU.
  const variantDefiningAttributeIds = new Set(
    attributes
      .filter((group) => {
        const groupValueIds = new Set(group.values.map((v) => v.id));
        return variants.some((v) => v.attributeValueIds.some((id) => groupValueIds.has(id)));
      })
      .map((group) => group.attribute.id),
  );

  function valueIdForGroup(variant: ProductVariantWithImages, groupValueIds: Set<string>): string | undefined {
    return variant.attributeValueIds.find((id) => groupValueIds.has(id));
  }

  // Finds every variant matching the given dimensions -- color and/or
  // variant-defining attribute value ids. A dimension left `undefined`
  // (not yet decided) doesn't constrain the search at all; this is what
  // lets the same function answer both "what's the ONE active variant for
  // my full current selection" and "does ANY variant exist if I changed
  // just this one dimension."
  function findMatchingVariants(dimensions: {
    color?: string;
    [attributeId: string]: string | undefined;
  }): ProductVariantWithImages[] {
    return variants.filter((v) => {
      if (colorOptions.length > 0 && dimensions.color !== undefined) {
        if (normalizeColor(v.color_name) !== dimensions.color) return false;
      }
      for (const group of attributes) {
        if (!variantDefiningAttributeIds.has(group.attribute.id)) continue;
        const selected = dimensions[group.attribute.id];
        if (selected === undefined) continue;
        const groupValueIds = new Set(group.values.map((x) => x.id));
        if (valueIdForGroup(v, groupValueIds) !== selected) return false;
      }
      return true;
    });
  }

  // The attribute values a given variant "carries" -- for a variant-
  // defining group this is the value actually linked to the variant; for a
  // non-variant-defining group (a reference-only spec, e.g. a single-value
  // "Mah" assigned at the product level, never tied to any specific
  // variant -- the common case per the comment above) there's no
  // variant-driven answer, so it defaults to that group's first value
  // instead. That's always a safe pick: a non-variant-defining group has
  // zero effect on price/stock/SKU/matching by definition, so ANY of its
  // values is equally correct -- the alternative (leaving it unselected)
  // is what blocked Add to Cart with "Please select a Mah" until the
  // customer manually tapped a choice that changed nothing. Shared by
  // defaultDimensions (page load) and handleColorSelect (picking a color
  // whose only variant(s) need a different value on some other dimension
  // too).
  function attributeValuesForVariant(variant: ProductVariantWithImages): Record<string, AttributeValue> {
    const attributeValues: Record<string, AttributeValue> = {};
    for (const group of attributes) {
      if (group.values.length === 0) continue;
      if (!variantDefiningAttributeIds.has(group.attribute.id)) {
        attributeValues[group.attribute.id] = group.values[0];
        continue;
      }
      const groupValueIds = new Set(group.values.map((v) => v.id));
      const matchedId = valueIdForGroup(variant, groupValueIds);
      const matchedValue = group.values.find((v) => v.id === matchedId);
      if (matchedValue) attributeValues[group.attribute.id] = matchedValue;
    }
    return attributeValues;
  }

  // A variant "fully" resolves the product's variant-defining attributes
  // when it's actually linked to a value for every one of them -- normally
  // true for every variant (that's what "variant-defining" means: at least
  // one variant links to it), but a single variant added without a link
  // for one of those groups would otherwise land the page on an
  // unaddable-without-clicking selection despite this fix. Defensive, not
  // yet triggered by any real product in the catalog.
  function variantFullyResolvesAttributes(variant: ProductVariantWithImages): boolean {
    const linkedIds = new Set(variant.attributeValueIds);
    for (const group of attributes) {
      if (!variantDefiningAttributeIds.has(group.attribute.id)) continue;
      if (!group.values.some((v) => linkedIds.has(v.id))) return false;
    }
    return true;
  }

  function defaultDimensions(): {
    colorKey: string | null;
    attributeValues: Record<string, AttributeValue>;
  } {
    if (variants.length === 0) return { colorKey: null, attributeValues: {} };
    // Same algorithm the shop card uses to pick a product's displayed
    // variant (lib/utils.ts's pickWinningVariant) -- the PDP must land on
    // the exact variant the card already showed a price for, or the two
    // surfaces show different numbers for the same product on load. If
    // that variant can't fully populate every variant-defining attribute
    // (see above), fall back to the highest-ranked variant among those
    // that can, rather than opening the page on a selection the customer
    // can't add to cart without first fixing it themselves.
    const fullyResolved = variants.filter(variantFullyResolvesAttributes);
    // A ?variant= id that's real, belongs to this product, and can fully
    // populate every variant-defining attribute wins over the usual
    // pickWinningVariant pick -- exactly what a campaign card's link
    // pointed at. Anything else (no param, a stale/foreign id, a variant
    // that can't fully resolve) falls straight through to today's default,
    // never an error.
    const requestedVariant = variantIdParam
      ? fullyResolved.find((v) => v.id === variantIdParam)
      : undefined;
    const defaultVariant =
      requestedVariant ?? pickWinningVariant(fullyResolved.length > 0 ? fullyResolved : variants);
    return {
      colorKey: colorOptions.length > 0 ? normalizeColor(defaultVariant.color_name) : null,
      attributeValues: attributeValuesForVariant(defaultVariant),
    };
  }

  const [selectedColorKey, setSelectedColorKey] = useState<string | null>(
    () => defaultDimensions().colorKey,
  );
  const [selectedAttributeValues, setSelectedAttributeValues] = useState<
    Record<string, AttributeValue>
  >(() => defaultDimensions().attributeValues);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  // Drives the FloatingPurchaseBar's visibility -- true once the real
  // in-page purchase block (quantity/errors/Add to Cart/Buy Now, ref'd
  // below) has scrolled out of view. IntersectionObserver, not a
  // scroll-position calculation, so it stays correct regardless of page
  // length. rootMargin shrinks the effective viewport by the bottom nav's
  // height so the target counts as "gone" once it's hidden behind the
  // (opaque, always-on-this-route) nav, not just technically still inside
  // the raw viewport rectangle.
  const purchaseActionsRef = useRef<HTMLDivElement>(null);
  const [floatingBarVisible, setFloatingBarVisible] = useState(false);

  useEffect(() => {
    const el = purchaseActionsRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setFloatingBarVisible(!entry.isIntersecting),
      { rootMargin: "0px 0px -90px 0px", threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const dimensions: { color?: string; [attributeId: string]: string | undefined } = {
    color: selectedColorKey ?? undefined,
  };
  for (const [attributeId, value] of Object.entries(selectedAttributeValues)) {
    dimensions[attributeId] = value.id;
  }
  // The one variant matching the FULL current selection -- every other
  // piece of derived state (price, stock, SKU, gallery, cart payload)
  // reads off this, so nothing can ever go stale or fall back silently to
  // the wrong variant.
  const resolvedVariant = variants.length > 0 ? (findMatchingVariants(dimensions)[0] ?? null) : null;
  // Same price-band resolution resolveCardDisplay uses server-side for
  // cards -- reused, not reimplemented, so the PDP and the shop card never
  // disagree about which price band (regular/sale/campaign) wins. Pure
  // function of whatever resolvedVariant currently is, so switching to a
  // non-campaign variant automatically falls back with no residual
  // campaign price/badge -- no extra state, nothing to go stale.
  const priceBand = resolvedVariant ? resolveEffectivePriceBand(resolvedVariant) : null;

  // Fires once per page view, using whichever variant the page happened to
  // open on -- switching color/attribute afterwards must NOT re-fire
  // ViewContent (that's what AddToCart/the variant selectors are for).
  // Empty deps intentionally: this closes over resolvedVariant/priceBand
  // from the render that mounted this effect, which is exactly the initial
  // default variant, and never re-runs after that.
  useEffect(() => {
    const price = priceBand?.specialPrice ?? resolvedVariant?.regular_price ?? 0;
    trackConversion("ViewContent", {
      productId: product.id,
      value: price,
      pixelParams: {
        content_ids: [product.id],
        content_name: product.name,
        content_type: "product",
        value: price,
        currency: "LKR",
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const effectiveStock =
    resolvedVariant?.stock != null ? resolvedVariant.stock : product.stock;
  const outOfStock = effectiveStock <= 0;
  const primaryImage = resolvedVariant?.images[0] ?? images[0] ?? null;

  // Clamps quantity to whatever the NEXT selection's resolved variant can
  // actually fulfill -- computed synchronously against the current
  // dimensions plus this one change, since the underlying state update
  // (and therefore resolvedVariant) hasn't landed yet at the point this
  // runs. Covers both a color change and an attribute change identically.
  function clampQuantityFor(nextDimensions: { color?: string; [attributeId: string]: string | undefined }) {
    const nextVariant = findMatchingVariants(nextDimensions)[0] ?? null;
    const nextStock = nextVariant?.stock != null ? nextVariant.stock : product.stock;
    setQuantity((q) => Math.max(1, Math.min(q, Math.max(1, nextStock))));
  }

  // Picking a color can require some OTHER attribute to change too (e.g.
  // this product's two variants are White/1000-5000mAh and White-new/
  // 5000-10000mAh -- there's no variant at all for White + 5000-10000mAh).
  // If the color you clicked doesn't exist combined with what's currently
  // selected elsewhere, jump straight to a real variant of that color (same
  // pickWinningVariant tie-break as defaultDimensions) instead of leaving
  // the click landing on an unreachable combination the user could never
  // get out of by clicking one swatch at a time.
  function handleColorSelect(key: string) {
    setSelectionError(null);
    const stillMatches = findMatchingVariants({ ...dimensions, color: key }).length > 0;
    let nextDimensions: { color?: string; [attributeId: string]: string | undefined } = {
      ...dimensions,
      color: key,
    };

    if (!stillMatches) {
      const colorVariants = variants.filter((v) => normalizeColor(v.color_name) === key);
      const target = colorVariants.length > 0 ? pickWinningVariant(colorVariants) : undefined;
      if (target) {
        const nextAttributeValues = attributeValuesForVariant(target);
        setSelectedAttributeValues(nextAttributeValues);
        nextDimensions = { color: key };
        for (const [attributeId, value] of Object.entries(nextAttributeValues)) {
          nextDimensions[attributeId] = value.id;
        }
      }
    }

    setSelectedColorKey(key);
    clampQuantityFor(nextDimensions);
  }

  function handleAttributeSelect(attributeId: string, value: AttributeValue) {
    setSelectedAttributeValues((prev) => ({ ...prev, [attributeId]: value }));
    setSelectionError(null);
    clampQuantityFor({ ...dimensions, [attributeId]: value.id });
  }

  // A color swatch is only ever struck-through/unclickable for a genuine
  // "every variant of this color is sold out" -- NOT for "impossible with
  // whatever's currently selected on another dimension," since
  // handleColorSelect above always resolves that case to a real variant
  // instead. (Attribute pills, e.g. Mah, keep the stricter
  // impossible-OR-sold-out disabling below -- unchanged, by design.)
  function isColorSoldOut(key: string): boolean {
    const colorVariants = variants.filter((v) => normalizeColor(v.color_name) === key);
    return colorVariants.length === 0 || colorVariants.every((v) => v.stock === 0);
  }

  function isAttributeValueDisabled(attributeId: string, valueId: string): boolean {
    const matches = findMatchingVariants({ ...dimensions, [attributeId]: valueId });
    return matches.length === 0 || matches.every((v) => v.stock === 0);
  }

  // Flags any variant-defining group whose disabled-options set just
  // changed as a side effect of a DIFFERENT selector (e.g. Mah's options
  // after a Color tap) -- a group's own disabled set never depends on its
  // own current selection, only on other dimensions, so this naturally
  // never flags the control the customer just tapped themselves.
  //
  // disabledSnapshot itself is plain derived data, cheap to recompute every
  // render. The diff/flash-timer logic, though, has to live inside an
  // effect keyed on a STABLE string (disabledSnapshotKey), not on
  // disabledSnapshot directly (a new object identity every render, which
  // would make the effect re-run on every render regardless of whether
  // availability actually changed) and not ref reads/writes during render
  // (this project's lint config -- react-hooks/refs -- rejects that; same
  // "no side effects during the render phase" family of rule as the
  // set-state-in-effect one that caught the CartContext bug earlier).
  const disabledSnapshot: Record<string, string> = {};
  for (const group of attributes) {
    if (!variantDefiningAttributeIds.has(group.attribute.id)) continue;
    disabledSnapshot[group.attribute.id] = group.values
      .filter((v) => isAttributeValueDisabled(group.attribute.id, v.id))
      .map((v) => v.id)
      .sort()
      .join(",");
  }
  const disabledSnapshotKey = Object.entries(disabledSnapshot)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, val]) => `${id}:${val}`)
    .join("|");

  const prevDisabledRef = useRef<Record<string, string> | null>(null);
  const [flashingIds, setFlashingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const prev = prevDisabledRef.current;
    prevDisabledRef.current = disabledSnapshot;
    if (!prev) return;
    const changed = new Set<string>();
    for (const id of Object.keys(disabledSnapshot)) {
      if (prev[id] !== disabledSnapshot[id]) changed.add(id);
    }
    if (changed.size === 0) return;
    // One-off sync of derived UI state to an external-ish change
    // (disabledSnapshotKey), same legitimate case CartContext.tsx already
    // disables this rule for -- there's no callback/subscription to defer
    // this into, the whole point is flagging it the instant it changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFlashingIds(changed);
    const timer = setTimeout(() => setFlashingIds(new Set()), 300);
    return () => clearTimeout(timer);
    // disabledSnapshotKey is the complete, stable summary of everything
    // this effect reads (disabledSnapshot is recomputed from the exact
    // same source data every render, just not a stable object identity).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabledSnapshotKey]);

  // A single color (or none at all -- the invisible "default" variant)
  // means there's no real choice to present, so no swatch section at all,
  // not a one-option selector.
  const colorSwatchOptions: ColorSwatchOption[] =
    colorOptions.length > 1
      ? colorOptions.map((option) => ({
          ...option,
          disabled: isColorSoldOut(option.key),
        }))
      : [];

  // A color must be picked whenever the product has any, every attribute
  // group returned for this product is required (variant-defining or not
  // -- non-defining ones stay a plain required reference choice, exactly
  // as before), and if somehow the full selection still resolves to no
  // real variant, block rather than silently fall back to a wrong price.
  function validateSelections(): string | null {
    if (colorOptions.length > 0 && !selectedColorKey) {
      return "Please select a color before adding to cart.";
    }
    const missing = attributes.find((group) => !selectedAttributeValues[group.attribute.id]);
    if (missing) {
      return `Please select a ${missing.attribute.name} before adding to cart.`;
    }
    if (variants.length > 0 && !resolvedVariant) {
      return "This combination is unavailable.";
    }
    return null;
  }

  function handleBeforeAdd(): boolean {
    const error = validateSelections();
    setSelectionError(error);
    return !error;
  }

  const attributeSelections: AttributeSelection[] = attributes
    .map((group) => {
      const value = selectedAttributeValues[group.attribute.id];
      return value ? { attributeName: group.attribute.name, value: value.value } : null;
    })
    .filter((s): s is AttributeSelection => s !== null);

  // Live, not gated behind a failed Add to Cart click -- lets the customer
  // see which group needs attention before they ever hit the error
  // message. Should never actually be true post page-load now that
  // initialization populates every group (see attributeValuesForVariant),
  // but stays as a visible safety net rather than a silent block.
  const colorSelectionMissing = colorOptions.length > 0 && !selectedColorKey;

  // Presentational-only stock categorization, same 3-tier scheme
  // ProductCard already uses (in/low/out) -- derived from the exact same
  // effectiveStock/outOfStock values everything else on this page (Add to
  // Cart disabling, quantity clamping) reads, so it can never disagree with
  // the real availability logic. Purely which color dot/label to show.
  const stockVisual = outOfStock
    ? { dot: "bg-[var(--color-discount)]", text: "text-[var(--color-discount)]", label: "Out of stock" }
    : effectiveStock < 5
      ? {
          dot: "bg-[var(--color-warning)]",
          text: "text-[var(--color-warning)]",
          label: `Only ${effectiveStock} left`,
        }
      : { dot: "bg-[#16a34a]", text: "text-[#16a34a]", label: `${effectiveStock} in stock` };

  // Eyebrow above the title -- category and brand, whichever exist.
  // categoryName arrives as "—" when the product has none (page.tsx's own
  // fallback for the unrelated SpecsTable/ProductTabs props), so that
  // placeholder is filtered out here rather than shown as a fake category.
  const eyebrowParts = [categoryName !== "—" ? categoryName : null, product.brand].filter(
    (part): part is string => Boolean(part),
  );

  const hasAttributeCard = colorSwatchOptions.length > 0 || attributes.some((g) => g.values.length > 0);

  return (
    <>
    <div className="mt-8 grid gap-8 lg:grid-cols-[52%_1fr] lg:gap-10">
      <ProductGalleryWithVariants
        images={images}
        resolvedVariant={resolvedVariant}
        name={product.name}
      />

      {/* min-w-0 overrides the grid item's default min-width:auto -- the
          same "flexbox/grid content blowout" fix as ProductGalleryWithVariants,
          otherwise the price line's flex-nowrap or the title's natural width
          can push this column (and the whole page) wider than the viewport. */}
      <div className="min-w-0">
        {priceBand?.campaignId && priceBand.campaignName && (
          <div className="mb-3">
            <CampaignInfoBlock
              campaignName={priceBand.campaignName}
              campaignEndAt={priceBand.campaignEndAt}
              soldCount={resolvedVariant?.campaign_sold_count ?? null}
            />
          </div>
        )}
        {tags.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag.slug}
                className="rounded-full bg-[var(--foreground)] px-[10px] py-[3px] text-[11px] font-semibold text-white"
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}
        {eyebrowParts.length > 0 && (
          <p className="text-xs font-semibold tracking-wide text-[var(--color-text-secondary)] uppercase">
            {eyebrowParts.join(" · ")}
          </p>
        )}
        <ProductTitleClamp
          title={product.name}
          className="font-heading mt-1 text-[28px] leading-tight font-bold tracking-tight sm:text-3xl"
        />

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {/* Only rendered for products with real, approved reviews -- an
              empty/zero-star row here would be exactly the fabricated-looking
              signal the no-fake-reviews rule exists to prevent. The full
              Reviews tab below still has its own always-visible empty state
              today (ProductTabs/ReviewsSection) -- out of scope for this
              phase, which only touches the title block. */}
          {ratingSummary && ratingSummary.review_count > 0 && (
            <div className="flex items-center gap-1.5">
              <StarRating rating={ratingSummary.avg_rating} size="sm" />
              <span className="text-sm text-[var(--muted)]">
                {ratingSummary.avg_rating.toFixed(1)} ({ratingSummary.review_count})
              </span>
            </div>
          )}
          {product.sku && (
            <span className="text-xs text-[var(--muted)]">SKU: {product.sku}</span>
          )}
        </div>
        <div className="mt-3 h-px bg-[var(--border)]" />

        <div className="mt-4">
          <PriceDisplay
            actualPrice={resolvedVariant?.regular_price ?? 0}
            specialPrice={priceBand?.specialPrice ?? null}
            size="md"
          />
        </div>
        <p className={`mt-3 flex items-center gap-2 text-sm font-medium ${stockVisual.text}`}>
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${stockVisual.dot}`} aria-hidden="true" />
          {stockVisual.label}
        </p>

        {/* All variant selectors grouped into one bordered card,
            immediately below price/stock -- Colour and Capacity (and any
            future Size/Connector) render adjacent to each other so
            changing one visibly updates the others in the same screenful,
            instead of Colour sitting up by the gallery while the rest
            lived ~1000px further down. */}
        {hasAttributeCard && (
          <AttributeCard>
            <VariantSwatches
              options={colorSwatchOptions}
              selectedKey={selectedColorKey}
              onSelect={handleColorSelect}
              hasError={colorSelectionMissing}
            />

            {attributes.map((group) => (
              <AttributeSelector
                key={group.attribute.id}
                attribute={group.attribute}
                values={group.values}
                selectedId={selectedAttributeValues[group.attribute.id]?.id ?? null}
                onSelect={(value) => handleAttributeSelect(group.attribute.id, value)}
                hasError={!selectedAttributeValues[group.attribute.id]}
                flash={flashingIds.has(group.attribute.id)}
                disabledIds={
                  variantDefiningAttributeIds.has(group.attribute.id)
                    ? new Set(
                        group.values
                          .filter((v) => isAttributeValueDisabled(group.attribute.id, v.id))
                          .map((v) => v.id),
                      )
                    : undefined
                }
              />
            ))}
          </AttributeCard>
        )}

        <div ref={purchaseActionsRef} className="mt-6 flex flex-col gap-4">
          {!outOfStock && (
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Quantity</span>
              <div className="flex items-center rounded-full border border-[var(--border)] transition-[border-color,box-shadow] duration-200 ease-in-out focus-within:border-[var(--foreground)] focus-within:ring-4 focus-within:ring-[rgba(0,0,0,0.08)]">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="flex h-10 w-10 items-center justify-center text-lg outline-none transition-colors hover:bg-black/5"
                >
                  −
                </button>
                <span className="w-8 text-center text-sm" aria-live="polite">
                  {quantity}
                </span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  onClick={() => setQuantity((q) => Math.min(effectiveStock, q + 1))}
                  className="flex h-10 w-10 items-center justify-center text-lg outline-none transition-colors hover:bg-black/5"
                >
                  +
                </button>
              </div>
            </div>
          )}

          {selectionError && (
            <p role="alert" className="text-sm font-medium text-[var(--color-discount)]">
              {selectionError}
            </p>
          )}

          <AddToCartForm
            product={product}
            variant={resolvedVariant}
            attributeSelections={attributeSelections}
            image={primaryImage}
            quantity={quantity}
            outOfStock={outOfStock}
            onBeforeAdd={handleBeforeAdd}
          />

          <div className="flex items-center gap-3">
            <BuyNowButton
              product={product}
              variant={resolvedVariant}
              attributeSelections={attributeSelections}
              image={primaryImage}
              quantity={quantity}
              outOfStock={outOfStock}
              onBeforeAdd={handleBeforeAdd}
            />
            <WishlistButton
              productId={product.id}
              slug={product.slug}
              name={product.name}
              price={resolvedVariant ? getVariantPrice(resolvedVariant) : 0}
              variantId={resolvedVariant?.id ?? null}
              image={primaryImage}
              className="transition-brand flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-btn)] border border-[var(--border)] bg-white hover:bg-black/5"
            />
            {!outOfStock && (
              <WhatsAppOrderButton
                productName={product.name}
                colorName={resolvedVariant?.color_name ?? null}
                quantity={quantity}
                price={resolvedVariant ? getVariantPrice(resolvedVariant) : 0}
              />
            )}
          </div>

          {outOfStock && <NotifyMeForm productId={product.id} />}

          <ShareButtons productName={product.name} />
        </div>

        {/* Supporting information, not purchase decisions -- moved below
            the purchase actions so it no longer sits between the variant
            selectors and the buttons/quantity that need to be seen
            together. */}
        {!outOfStock && (
          <DeliveryInfoCard
            deliveryLabel={getEstimatedDeliveryRange().label}
            codAvailable={product.cod_available}
            inZoneRate={inZoneRate}
            outsideZoneRate={outsideZoneRate}
          />
        )}
      </div>
    </div>

    {/* Full-width below the gallery/purchase grid, not squeezed into the
        right column -- Specs needs 5 real columns and Tabs needs its own
        ~820px reading width, neither of which fit in a ~48%-wide column. */}
    <ProductHighlights specs={specs} />

    <WhatsInBox items={product.whats_in_box} />

    <div className="mt-10">
      <TrustBadges
        compact
        codAvailable={product.cod_available}
        warrantyAvailable={product.warranty_available}
      />
    </div>

    <ProductTabs
      product={product}
      categoryName={categoryName}
      specs={specs}
      reviews={reviews}
      ratingSummary={ratingSummary}
      reviewState={reviewState}
    />

    {!outOfStock && (
      <FloatingPurchaseBar
        visible={floatingBarVisible}
        product={product}
        variant={resolvedVariant}
        attributeSelections={attributeSelections}
        image={primaryImage}
        quantity={quantity}
        outOfStock={outOfStock}
        actualPrice={resolvedVariant?.regular_price ?? 0}
        specialPrice={priceBand?.specialPrice ?? null}
        selectionError={selectionError}
        onBeforeAdd={handleBeforeAdd}
      />
    )}
    </>
  );
}
