"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Modal } from "@/components/ui/Modal";
import { ProductGalleryWithVariants } from "@/components/product/ProductGalleryWithVariants";
import { PriceDisplay } from "@/components/product/PriceDisplay";
import { AddToCartForm } from "@/components/product/AddToCartForm";
import { Skeleton } from "@/components/ui/Skeleton";
import { getQuickViewProduct } from "@/lib/quick-view";
import type { ProductDetail } from "@/lib/data/products";
import type { ProductVariant } from "@/types";

export function QuickViewModal({ slug, onClose }: { slug: string; onClose: () => void }) {
  const [detail, setDetail] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    let cancelled = false;
    getQuickViewProduct(slug).then((result) => {
      if (cancelled) return;
      setDetail(result);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading || !detail) {
    return (
      <Modal onClose={onClose} ariaLabel="Quick view">
        <div className="grid gap-6 sm:grid-cols-2">
          <Skeleton className="aspect-square w-full" />
          <div className="flex flex-col gap-3">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </Modal>
    );
  }

  const { product, images, variants } = detail;
  const effectiveStock = selectedVariant?.stock != null ? selectedVariant.stock : product.stock;
  const outOfStock = effectiveStock <= 0;
  const primaryImage = selectedVariant?.variant_image_url ?? images[0]?.image_url ?? null;

  function handleVariantChange(variant: ProductVariant | null) {
    setSelectedVariant(variant);
    const nextStock = variant?.stock != null ? variant.stock : product.stock;
    setQuantity((q) => Math.min(q, Math.max(1, nextStock)));
  }

  return (
    <Modal onClose={onClose} ariaLabel={`Quick view: ${product.name}`}>
      <div className="grid gap-6 sm:grid-cols-2">
        <ProductGalleryWithVariants
          images={images.map((img) => img.image_url)}
          variants={variants}
          name={product.name}
          onVariantChange={handleVariantChange}
        />

        <div>
          <h2 className="pr-8 text-lg font-bold tracking-tight">{product.name}</h2>
          <div className="mt-2">
            <PriceDisplay actualPrice={product.actual_price} specialPrice={product.special_price} />
          </div>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {outOfStock ? "Out of stock" : `${effectiveStock} in stock`}
          </p>

          <div className="mt-6 flex flex-col gap-4">
            {!outOfStock && (
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">Quantity</span>
                <div className="flex items-center rounded-full border border-[var(--border)]">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="flex h-9 w-9 items-center justify-center text-lg outline-none"
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
                    className="flex h-9 w-9 items-center justify-center text-lg outline-none"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            <AddToCartForm
              product={product}
              image={primaryImage}
              quantity={quantity}
              outOfStock={outOfStock}
            />

            <Link
              href={`/product/${product.slug}`}
              className="text-sm underline underline-offset-2"
            >
              View full details →
            </Link>
          </div>
        </div>
      </div>
    </Modal>
  );
}
