"use client";

import { useState } from "react";
import { ProductGalleryWithVariants } from "@/components/product/ProductGalleryWithVariants";
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
import { getEffectiveVariantPrice } from "@/lib/utils";
import { getEstimatedDeliveryRange } from "@/lib/delivery";
import type { ProductVariantWithImages } from "@/lib/data/products";
import type { Attribute, AttributeSelection, AttributeValue, Product, ProductRatingSummary } from "@/types";
import type { ReviewWithReviewerName } from "@/lib/reviews";
import type { DisplaySpec } from "@/lib/data/spec-templates";

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
}) {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariantWithImages | null>(null);
  const [selectedAttributeValues, setSelectedAttributeValues] = useState<Record<string, AttributeValue>>({});
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  const effectiveStock =
    selectedVariant?.stock != null ? selectedVariant.stock : product.stock;
  const outOfStock = effectiveStock <= 0;
  const primaryImage = selectedVariant?.images[0] ?? images[0] ?? null;

  function handleVariantChange(variant: ProductVariantWithImages | null) {
    setSelectedVariant(variant);
    setSelectionError(null);
    const nextStock = variant?.stock != null ? variant.stock : product.stock;
    setQuantity((q) => Math.min(q, Math.max(1, nextStock)));
  }

  function handleAttributeSelect(attributeId: string, value: AttributeValue) {
    setSelectedAttributeValues((prev) => ({ ...prev, [attributeId]: value }));
    setSelectionError(null);
  }

  // A color must be picked whenever the product has any, and every
  // attribute group returned for this product (e.g. "Mah") is required
  // too -- returns a human-readable reason, or null if everything needed
  // is selected.
  function validateSelections(): string | null {
    if (variants.length > 0 && !selectedVariant) {
      return "Please select a color before adding to cart.";
    }
    const missing = attributes.find((group) => !selectedAttributeValues[group.attribute.id]);
    if (missing) {
      return `Please select a ${missing.attribute.name} before adding to cart.`;
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

  return (
    <div className="mt-6 grid gap-10 sm:grid-cols-2">
      <ProductGalleryWithVariants
        images={images}
        variants={variants}
        name={product.name}
        onVariantChange={handleVariantChange}
      />

      <div>
        {tags.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
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
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          {product.name}
        </h1>
        <div className="mt-2">
          {selectedVariant?.price != null ? (
            <PriceDisplay actualPrice={selectedVariant.price} specialPrice={null} />
          ) : (
            <PriceDisplay
              actualPrice={product.actual_price}
              specialPrice={product.special_price}
            />
          )}
        </div>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {outOfStock ? "Out of stock" : `${effectiveStock} in stock`}
        </p>
        {!outOfStock && (
          <p className="mt-1 text-xs text-[var(--muted)]">
            {getEstimatedDeliveryRange().label}
          </p>
        )}

        {attributes.map((group) => (
          <AttributeSelector
            key={group.attribute.id}
            attribute={group.attribute}
            values={group.values}
            selectedId={selectedAttributeValues[group.attribute.id]?.id ?? null}
            onSelect={(value) => handleAttributeSelect(group.attribute.id, value)}
          />
        ))}

        <div className="mt-8 flex flex-col gap-4">
          {!outOfStock && (
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Quantity</span>
              <div className="flex items-center rounded-full border border-[var(--border)] transition-[border-color,box-shadow] duration-200 ease-in-out focus-within:border-[var(--foreground)] focus-within:ring-4 focus-within:ring-[rgba(0,0,0,0.08)]">
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

          {selectionError && (
            <p role="alert" className="text-sm font-medium text-[var(--color-discount)]">
              {selectionError}
            </p>
          )}

          <AddToCartForm
            product={product}
            variant={selectedVariant}
            attributeSelections={attributeSelections}
            image={primaryImage}
            quantity={quantity}
            outOfStock={outOfStock}
            onBeforeAdd={handleBeforeAdd}
          />

          <div className="flex flex-wrap items-center gap-3">
            <BuyNowButton
              product={product}
              variant={selectedVariant}
              attributeSelections={attributeSelections}
              image={primaryImage}
              quantity={quantity}
              outOfStock={outOfStock}
              onBeforeAdd={handleBeforeAdd}
            />
            <WishlistButton product={product} image={primaryImage} />
            {!outOfStock && (
              <WhatsAppOrderButton
                productName={product.name}
                colorName={selectedVariant?.color_name ?? null}
                quantity={quantity}
                price={getEffectiveVariantPrice(product, selectedVariant)}
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

        <ProductTabs
          product={product}
          categoryName={categoryName}
          specs={specs}
          reviews={reviews}
          ratingSummary={ratingSummary}
          reviewState={reviewState}
        />
      </div>
    </div>
  );
}
