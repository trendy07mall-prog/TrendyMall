"use client";

import { useState } from "react";
import { ProductGalleryWithVariants } from "@/components/product/ProductGalleryWithVariants";
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
import { getEffectivePrice } from "@/lib/utils";
import type { Product, ProductVariant } from "@/types";

export function ProductPurchaseSection({
  product,
  images,
  variants,
  categoryName,
}: {
  product: Product;
  images: string[];
  variants: ProductVariant[];
  categoryName: string;
}) {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);

  const effectiveStock =
    selectedVariant?.stock != null ? selectedVariant.stock : product.stock;
  const outOfStock = effectiveStock <= 0;
  const primaryImage = selectedVariant?.variant_image_url ?? images[0] ?? null;

  function handleVariantChange(variant: ProductVariant | null) {
    setSelectedVariant(variant);
    const nextStock = variant?.stock != null ? variant.stock : product.stock;
    setQuantity((q) => Math.min(q, Math.max(1, nextStock)));
  }

  return (
    <div className="mt-6 grid gap-10 sm:grid-cols-2">
      <ProductGalleryWithVariants
        images={images}
        variants={variants}
        name={product.name}
        onVariantChange={handleVariantChange}
      />

      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          {product.name}
        </h1>
        <div className="mt-2">
          <PriceDisplay
            actualPrice={product.actual_price}
            specialPrice={product.special_price}
          />
        </div>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {outOfStock ? "Out of stock" : `${effectiveStock} in stock`}
        </p>

        <div className="mt-8 flex flex-col gap-4">
          {!outOfStock && (
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Quantity</span>
              <div className="flex items-center rounded-full border border-[var(--border)]">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="flex h-9 w-9 items-center justify-center text-lg"
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
                  className="flex h-9 w-9 items-center justify-center text-lg"
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

          <div className="flex flex-wrap items-center gap-3">
            <BuyNowButton
              product={product}
              image={primaryImage}
              quantity={quantity}
              outOfStock={outOfStock}
            />
            <WishlistButton product={product} image={primaryImage} />
            {!outOfStock && (
              <WhatsAppOrderButton
                productName={product.name}
                colorName={selectedVariant?.color_name ?? null}
                quantity={quantity}
                price={getEffectivePrice(product)}
              />
            )}
          </div>

          {outOfStock && <NotifyMeForm productId={product.id} />}

          <ShareButtons productName={product.name} />
        </div>

        <WhatsInBox items={product.whats_in_box} />

        <div className="mt-8">
          <TrustBadges compact />
        </div>

        <ProductTabs product={product} categoryName={categoryName} />
      </div>
    </div>
  );
}
