"use client";

import { useMemo, useState } from "react";
import { ProductGallery } from "@/components/product/ProductGallery";
import { VariantSwatches } from "@/components/product/VariantSwatches";
import type { ProductVariant } from "@/types";

export function ProductGalleryWithVariants({
  images,
  variants,
  name,
}: {
  images: string[];
  variants: ProductVariant[];
  name: string;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedVariant = variants.find((v) => v.id === selectedId) ?? null;

  const displayImages = useMemo(() => {
    if (selectedVariant?.variant_image_url) {
      return [selectedVariant.variant_image_url, ...images];
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
        onSelect={(variant) => setSelectedId(variant.id)}
      />
    </div>
  );
}
