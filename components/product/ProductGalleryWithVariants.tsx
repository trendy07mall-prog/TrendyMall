"use client";

import { useMemo, useState } from "react";
import { ProductGallery } from "@/components/product/ProductGallery";
import { VariantSwatches } from "@/components/product/VariantSwatches";
import type { ProductVariantWithImages } from "@/lib/data/products";

export function ProductGalleryWithVariants({
  images,
  variants,
  name,
  onVariantChange,
}: {
  images: string[];
  variants: ProductVariantWithImages[];
  name: string;
  onVariantChange?: (variant: ProductVariantWithImages | null) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedVariant = variants.find((v) => v.id === selectedId) ?? null;

  // A selected variant swaps the WHOLE gallery to its own image set (up to
  // 4, product_variant_images) -- falls back to the base product's images
  // if this variant has none of its own.
  const displayImages = useMemo(() => {
    if (selectedVariant && selectedVariant.images.length > 0) {
      return selectedVariant.images;
    }
    return images;
  }, [images, selectedVariant]);

  return (
    <div>
      {/* key forces a remount (resetting the gallery's internal "active"
          thumbnail index) whenever the selected variant changes, instead of
          syncing that reset via an effect. */}
      <ProductGallery key={selectedId ?? "base"} images={displayImages} name={name} />
      <VariantSwatches
        variants={variants}
        selectedId={selectedId}
        onSelect={(variant) => {
          setSelectedId(variant.id);
          onVariantChange?.(variant);
        }}
      />
    </div>
  );
}
