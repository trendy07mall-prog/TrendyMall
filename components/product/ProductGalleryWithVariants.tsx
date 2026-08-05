"use client";

import { ProductGallery } from "@/components/product/ProductGallery";
import { VariantSwatches, type ColorSwatchOption } from "@/components/product/VariantSwatches";
import type { ProductVariantWithImages } from "@/lib/data/products";

// Purely presentational now -- color selection state and the full
// combination lookup (which variant is actually active) both live in
// ProductPurchaseSection, since price/stock/attribute-disabling all need
// the same resolved variant this gallery displays.
export function ProductGalleryWithVariants({
  images,
  colorOptions,
  selectedColorKey,
  onColorSelect,
  resolvedVariant,
  name,
}: {
  images: string[];
  colorOptions: ColorSwatchOption[];
  selectedColorKey: string | null;
  onColorSelect: (key: string) => void;
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
    <div>
      {/* key forces a remount (resetting the gallery's internal "active"
          thumbnail index) whenever the resolved variant changes, instead of
          syncing that reset via an effect. */}
      <ProductGallery key={resolvedVariant?.id ?? "base"} images={displayImages} name={name} />
      <VariantSwatches options={colorOptions} selectedKey={selectedColorKey} onSelect={onColorSelect} />
    </div>
  );
}
