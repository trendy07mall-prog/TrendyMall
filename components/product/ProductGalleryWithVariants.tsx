"use client";

import { ProductGallery } from "@/components/product/ProductGallery";
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

  return (
    // min-w-0 overrides the grid item's default min-width:auto -- without
    // it, this column's intrinsic content width (e.g. the thumbnail row)
    // can blow out past the grid track and push the whole page wider.
    <div className="min-w-0">
      {/* key forces a remount (resetting the gallery's internal "active"
          thumbnail index) whenever the resolved variant changes, instead of
          syncing that reset via an effect. */}
      <ProductGallery key={resolvedVariant?.id ?? "base"} images={displayImages} name={name} />
    </div>
  );
}
