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
import { ProductTabs } from "@/components/product/ProductTabs";
import { StarRating } from "@/components/product/StarRating";
import { DeliveryInfoCard } from "@/components/product/DeliveryInfoCard";
import type { DeliveryZone } from "@/lib/delivery-fee";
import { ProductHighlights } from "@/components/product/ProductHighlights";
import { ProductTitleClamp } from "@/components/product/ProductTitleClamp";
import { FloatingPurchaseBar } from "@/components/product/FloatingPurchaseBar";
import { getVariantPrice, pickWinningVariant, resolveEffectivePriceBand } from "@/lib/utils";
import { getEstimatedDeliveryRange } from "@/lib/delivery";
import { trackConversion } from "@/lib/analytics/track";
import { VariantSwatches, type ColorSwatchOption } from "@/components/product/VariantSwatches";
import type { ProductVariantWithImages } from "@/lib/data/products";
import {
  COLOR_GROUP,
  cleanColorName,
  colorKey,
  findVariant,
  isValueUnavailable,
  selectOption,
  type OptionDims,
} from "@/lib/variant-options";
import type { Attribute, AttributeSelection, AttributeValue, Product, ProductRatingSummary } from "@/types";
import type { ReviewWithReviewerName } from "@/lib/reviews";
import type { DisplaySpec } from "@/lib/data/spec-templates";
import { BundleWhatsInside, type BundleInsideItem } from "@/components/product/BundleWhatsInside";

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
  zones,
  descriptionHtml,
  whatsappNumber,
  bundle = null,
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
  zones: DeliveryZone[];
  descriptionHtml: string;
  whatsappNumber: string;
  // Set only when this product is a bundle. Null for every normal
  // product, which is what keeps this whole component's existing
  // behaviour byte-for-byte unchanged for them.
  bundle?: {
    items: BundleInsideItem[];
    separateTotal: number;
    saving: number;
  } | null;
}) {
  // ?variant=<id> deep link -- set by campaign-context product cards
  // (ActiveCampaignSections.tsx, /campaign/[slug]'s ProductGrid) so the PDP
  // opens on the exact campaign-featured variant the card showed a price
  // for, instead of this product's own default. Read once here; validated
  // against this product's real variants inside defaultDimensions() below,
  // same place pickWinningVariant's own fallback already lives.
  const variantIdParam = useSearchParams().get("variant");

  // The option groups this product's variants are chosen by: Colour (when
  // there is more than one) and every attribute at least one variant is
  // linked to (Mah, Connector...). An attribute no variant links to stays
  // a reference-only choice, exactly as before. Each variant becomes a
  // set of "dims" (group key -> value id) so lib/variant-options.ts can
  // do the choosing, with tests.
  //
  // Colours are grouped by their CLEAN name (cleanColorName), so "White",
  // "White-new" and "White - 5000 mah - Lighting" are one swatch, not three
  // that look identical. A variant with no colour (the invisible "default"
  // variant every single-option product gets) never contributes one.
  const colorOptions: { key: string; name: string; hex: string }[] = [];
  for (const v of variants) {
    if (!v.color_name || !v.color_hex) continue;
    const key = colorKey(v.color_name);
    if (key && !colorOptions.some((o) => o.key === key)) {
      colorOptions.push({ key, name: cleanColorName(v.color_name), hex: v.color_hex });
    }
  }
  const hasColorChoice = colorOptions.length > 0;

  const variantDefiningGroups = attributes.filter((group) => {
    const groupValueIds = new Set(group.values.map((v) => v.id));
    return variants.some((v) => v.attributeValueIds.some((id) => groupValueIds.has(id)));
  });
  const variantDefiningAttributeIds = new Set(variantDefiningGroups.map((g) => g.attribute.id));

  function dimsFor(variant: ProductVariantWithImages): OptionDims {
    const dims: OptionDims = {};
    if (hasColorChoice) {
      const key = colorKey(variant.color_name);
      if (key) dims[COLOR_GROUP] = key;
    }
    for (const group of variantDefiningGroups) {
      const id = variant.attributeValueIds.find((valueId) => group.values.some((v) => v.id === valueId));
      if (id) dims[group.attribute.id] = id;
    }
    return dims;
  }
  const optionVariants = variants.map((variant) => ({ variant, dims: dimsFor(variant), stock: variant.stock }));

  // Every group a variant must answer: a variant missing one of these (an
  // old row never linked to, say, a Mah value) can't be the opening pick
  // when a fully described one exists.
  const requiredGroupKeys = [
    ...(hasColorChoice ? [COLOR_GROUP] : []),
    ...variantDefiningGroups.map((g) => g.attribute.id),
  ];

  // Where the page opens: the ?variant= one when it's real and fully
  // described (a campaign card's link), else the same winner the product
  // card showed a price for (pickWinningVariant), so the two never
  // disagree. Reference-only groups start on their first value.
  function initialSelection(): OptionDims {
    if (variants.length === 0) return {};
    const fullyDescribed = optionVariants.filter((o) => requiredGroupKeys.every((k) => o.dims[k] !== undefined));
    const pool = fullyDescribed.length > 0 ? fullyDescribed : optionVariants;
    const requested = variantIdParam ? pool.find((o) => o.variant.id === variantIdParam) : undefined;
    const winner = requested?.variant ?? pickWinningVariant(pool.map((o) => o.variant));
    const selection: OptionDims = { ...(optionVariants.find((o) => o.variant.id === winner.id)?.dims ?? {}) };
    for (const group of attributes) {
      if (!variantDefiningAttributeIds.has(group.attribute.id) && group.values[0]) {
        selection[group.attribute.id] = group.values[0].id;
      }
    }
    return selection;
  }

  const [selection, setSelection] = useState<OptionDims>(initialSelection);
  // Shown when a tap had to change another group ("10000mAh isn't made
  // with Lightning, so we changed Connectors to Type-C") -- nothing on
  // this page changes a customer's choice without saying so.
  const [switchNote, setSwitchNote] = useState<string | null>(null);
  const [flashingIds, setFlashingIds] = useState<Set<string>>(new Set());
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (flashTimer.current) clearTimeout(flashTimer.current);
  }, []);

  const selectedColorKey = hasColorChoice ? (selection[COLOR_GROUP] ?? null) : null;
  const selectedAttributeValues: Record<string, AttributeValue> = {};
  for (const group of attributes) {
    const value = group.values.find((v) => v.id === selection[group.attribute.id]);
    if (value) selectedAttributeValues[group.attribute.id] = value;
  }
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

  // Only the groups variants are chosen by -- a reference-only group's
  // pick never decides which variant you get.
  const variantSelection: OptionDims = {};
  for (const key of requiredGroupKeys) {
    if (selection[key] !== undefined) variantSelection[key] = selection[key];
  }
  // The one variant matching the FULL current selection -- every other
  // piece of derived state (price, stock, SKU, gallery, cart payload)
  // reads off this, so nothing can ever go stale or fall back silently to
  // the wrong variant.
  const resolvedVariant =
    variants.length > 0 ? (findVariant(optionVariants, variantSelection)?.variant ?? null) : null;
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

  // Unchanged, and correct for a bundle too: a bundle's single option
  // tracks no stock of its own, so this falls through to product.stock --
  // which sql/089 keeps equal to how many whole bundles the contents
  // allow. Everything downstream (the Add to Cart gate, the quantity
  // clamp, the stock dot) reads this one value.
  const effectiveStock =
    resolvedVariant?.stock != null ? resolvedVariant.stock : product.stock;
  const outOfStock = effectiveStock <= 0;
  const primaryImage = resolvedVariant?.images[0] ?? images[0] ?? null;

  // Every option tap goes through here, colour or attribute. The tap
  // always wins; when the rest of the selection can't go with it,
  // selectOption changes the fewest other groups and this says which.
  function handleOptionSelect(key: string, valueId: string) {
    setSelectionError(null);
    if (!requiredGroupKeys.includes(key)) {
      setSelection((prev) => ({ ...prev, [key]: valueId }));
      return;
    }
    const { selection: next, changed } = selectOption(optionVariants, selection, key, valueId);
    setSelection(next);

    const nextVariant = findVariant(optionVariants, next)?.variant ?? null;
    const nextStock = nextVariant?.stock != null ? nextVariant.stock : product.stock;
    setQuantity((q) => Math.max(1, Math.min(q, Math.max(1, nextStock))));

    if (changed.length > 0) {
      const tapped = optionLabel(key, valueId);
      const from = changed.map((c) => (c.from ? optionLabel(c.key, c.from) : null)).filter(Boolean);
      const to = changed.map((c) => `${groupName(c.key)} to ${optionLabel(c.key, c.to)}`);
      setSwitchNote(
        `${tapped} isn\u2019t available${from.length > 0 ? ` with ${from.join(" + ")}` : ""}, so we changed ${to.join(" and ")}.`,
      );
      if (flashTimer.current) clearTimeout(flashTimer.current);
      setFlashingIds(new Set(changed.map((c) => c.key)));
      flashTimer.current = setTimeout(() => setFlashingIds(new Set()), 1200);
    } else {
      setSwitchNote(null);
    }

    // Keep the address in step with the pick, so a refresh or a shared
    // link opens this exact variant (the same ?variant= a campaign card
    // uses). replaceState, so Back still leaves the product.
    if (nextVariant) {
      const url = new URL(window.location.href);
      url.searchParams.set("variant", nextVariant.id);
      window.history.replaceState(null, "", url);
    }
  }

  function groupName(key: string): string {
    if (key === COLOR_GROUP) return "Colour";
    return attributes.find((g) => g.attribute.id === key)?.attribute.name ?? "";
  }

  function optionLabel(key: string, valueId: string): string {
    if (key === COLOR_GROUP) return colorOptions.find((o) => o.key === valueId)?.name ?? valueId;
    return attributes.find((g) => g.attribute.id === key)?.values.find((v) => v.id === valueId)?.value ?? "";
  }

  // A swatch or pill is greyed out only when nothing with it can be bought
  // -- never because of what is picked in another row.
  function isOptionUnavailable(key: string, valueId: string): boolean {
    return isValueUnavailable(optionVariants, key, valueId);
  }

  // A single color (or none at all -- the invisible "default" variant)
  // means there's no real choice to present, so no swatch section at all,
  // not a one-option selector.
  const colorSwatchOptions: ColorSwatchOption[] =
    colorOptions.length > 1
      ? colorOptions.map((option) => ({
          ...option,
          disabled: isOptionUnavailable(COLOR_GROUP, option.key),
        }))
      : [];

  // A color must be picked whenever the product has any, every attribute
  // group returned for this product is required (variant-defining or not
  // -- non-defining ones stay a plain required reference choice, exactly
  // as before), and if somehow the full selection still resolves to no
  // real variant, block rather than silently fall back to a wrong price.
  function validateSelections(): string | null {
    if (hasColorChoice && !selectedColorKey) {
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
  // initialization populates every group, but stays as a visible safety
  // net rather than a silent block.
  const colorSelectionMissing = hasColorChoice && !selectedColorKey;

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
        {/* Campaign name/countdown/sold-count used to render here via
            CampaignInfoBlock. It now lives on the gallery's main image
            instead (GalleryCampaignBar, driven by this exact same
            priceBand/resolvedVariant data via ProductGalleryWithVariants)
            -- moved, not duplicated, so the page shows one campaign
            surface, not two saying the same thing in two places.
            CampaignInfoBlock itself is untouched and still renders
            unchanged everywhere else (ProductCard). */}
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--color-card)] p-4">
          {tags.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span
                  key={tag.slug}
                  className="rounded-full bg-black/5 px-2 py-0.5 text-[11px] font-semibold text-[var(--foreground)]"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}
          {eyebrowParts.length > 0 && (
            <p className="text-xs font-medium tracking-wide text-[var(--color-text-secondary)] uppercase">
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
              <span className="text-xs text-[var(--color-text-secondary)]">SKU: {product.sku}</span>
            )}
          </div>
        </div>

        <div className="mt-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--color-card)] p-4">
          <PriceDisplay
            actualPrice={resolvedVariant?.regular_price ?? 0}
            specialPrice={priceBand?.specialPrice ?? null}
            size="md"
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <p className={`flex items-center gap-2 text-sm font-medium ${stockVisual.text}`}>
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${stockVisual.dot}`} aria-hidden="true" />
              {stockVisual.label}
            </p>
            {!outOfStock && (
              <div className="ml-auto flex items-center gap-3">
                <span className="text-sm font-medium text-[var(--color-text-secondary)]">Quantity</span>
                <div className="flex items-center overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] transition-[border-color,box-shadow] duration-200 ease-in-out focus-within:border-[var(--foreground)] focus-within:ring-4 focus-within:ring-[rgba(0,0,0,0.08)]">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="flex h-9 w-9 items-center justify-center text-lg outline-none transition-colors hover:bg-black/5"
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
                    className="flex h-9 w-9 items-center justify-center text-lg outline-none transition-colors hover:bg-black/5"
                  >
                    +
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {bundle && (
          <BundleWhatsInside
            items={bundle.items}
            separateTotal={bundle.separateTotal}
            saving={bundle.saving}
          />
        )}

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
              onSelect={(key) => handleOptionSelect(COLOR_GROUP, key)}
              hasError={colorSelectionMissing}
              flash={flashingIds.has(COLOR_GROUP)}
            />

            {attributes.map((group) => (
              <AttributeSelector
                key={group.attribute.id}
                attribute={group.attribute}
                values={group.values}
                selectedId={selectedAttributeValues[group.attribute.id]?.id ?? null}
                onSelect={(value) => handleOptionSelect(group.attribute.id, value.id)}
                hasError={!selectedAttributeValues[group.attribute.id]}
                flash={flashingIds.has(group.attribute.id)}
                disabledIds={
                  variantDefiningAttributeIds.has(group.attribute.id)
                    ? new Set(
                        group.values
                          .filter((v) => isOptionUnavailable(group.attribute.id, v.id))
                          .map((v) => v.id),
                      )
                    : undefined
                }
              />
            ))}
          </AttributeCard>
        )}

        {/* role="status": a screen reader hears the change too. */}
        <p role="status" aria-live="polite" className={switchNote ? "variant-switch-note mt-3 flex items-start gap-2 rounded-[var(--radius-md)] px-3.5 py-2.5 text-sm leading-snug" : "sr-only"}>
          {switchNote && (
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="mt-0.5 h-4 w-4 shrink-0">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v5M12 16h.01" />
            </svg>
          )}
          {switchNote}
        </p>

        {/* Quantity now lives in the price card above; Share stays the last
            child here so this observed block's bottom edge -- which drives
            FloatingPurchaseBar's show/hide timing -- hasn't moved. */}
        <div ref={purchaseActionsRef} className="mt-6 flex flex-col gap-4">
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
                whatsappNumber={whatsappNumber}
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

        <WhatsInBox items={product.whats_in_box} />

        {/* Supporting information, not purchase decisions -- moved below
            the purchase actions so it no longer sits between the variant
            selectors and the buttons/quantity that need to be seen
            together. */}
        {!outOfStock && (
          <DeliveryInfoCard
            deliveryLabel={getEstimatedDeliveryRange().label}
            codAvailable={product.cod_available}
            zones={zones}
          />
        )}
      </div>
    </div>

    {/* Full-width below the gallery/purchase grid, not squeezed into the
        right column -- Specs needs 5 real columns and Tabs needs its own
        ~820px reading width, neither of which fit in a ~48%-wide column. */}
    <ProductHighlights specs={specs} />

    <div className="mt-10">
      <TrustBadges
        compact
        codAvailable={product.cod_available}
        warrantyAvailable={product.warranty_available}
      />
    </div>

    <ProductTabs
      product={product}
      descriptionHtml={descriptionHtml}
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
