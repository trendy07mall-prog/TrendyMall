"use client";

import { ProductGallery } from "@/components/product/ProductGallery";
import { resolveEffectivePriceBand } from "@/lib/utils";
import type { ProductVariantWithImages } from "@/lib/data/products";

// Purely presentational now -- color selection state and the full
// combination lookup (which variant is actually active) both live in
// ProductPurchaseSection, since price/stock/attribute-disabling all need
// the same resolved variant this gallery displays. Color swatches
// themselves render in ProductPurchaseSection too (grouped together with
// the other variant selectors), not here -- this component's only job is
// the gallery synced to the resolved variant.
export function ProductGalleryWithVariants({
  images,
  resolvedVariant,
  name,
}: {
  images: string[];
  resolvedVariant: ProductVariantWithImages | null;
  name: string;
}) {
  // The resolved variant swaps the WHOLE gallery to its own image set (up
  // to 4, product_variant_images) -- falls back to the base product's
  // images if it has none of its own. Two variants can share a color but
  // differ on another attribute (e.g. capacity) with different images, so
  // this follows the resolved variant, not just the color selection.
  const displayImages =
    resolvedVariant && resolvedVariant.images.length > 0 ? resolvedVariant.images : images;

  // Same pure function, same input (resolvedVariant) that ProductPurchaseSection
  // uses for the price display -- reused rather than reimplemented, so this
  // can never disagree with the price actually shown next to it about
  // whether a campaign is genuinely winning. campaignId is only set when
  // the campaign price actually beats both regular and sale price (see
  // resolveEffectivePriceBand in lib/utils.ts), which is the "genuinely
  // active" gate -- an expired or losing campaign_price on the row still
  // resolves to null here, same as it always has for the price band.
  const priceBand = resolvedVariant ? resolveEffectivePriceBand(resolvedVariant) : null;
  const campaign =
    priceBand?.campaignId && priceBand.campaignName
      ? {
          name: priceBand.campaignName,
          endAt: priceBand.campaignEndAt,
          soldCount: resolvedVariant?.campaign_sold_count ?? null,
        }
      : null;

  return (
    // min-w-0 overrides the grid item's default min-width:auto -- without
    // it, this column's intrinsic content width (e.g. the thumbnail row)
    // can blow out past the grid track and push the whole page wider.
    <div className="min-w-0">
      {/* key forces a remount (resetting the gallery's internal "active"
          thumbnail index) whenever the resolved variant changes, instead of
          syncing that reset via an effect. */}
      <ProductGallery
        key={resolvedVariant?.id ?? "base"}
        images={displayImages}
        name={name}
        campaign={campaign}
      />
    </div>
  );
}
