"use client";

import { useEffect, useRef } from "react";
import { PriceDisplay } from "@/components/product/PriceDisplay";
import { AddToCartForm } from "@/components/product/AddToCartForm";
import type { AttributeSelection, Product, ProductVariant } from "@/types";

// Publishes into its OWN CSS variable, --pdp-purchase-bar-height, rather
// than the existing --mobile-bottom-bar-offset -- MobileBottomNavClient
// already writes that variable on this route (the bottom nav is not
// hidden on /product/*, only on /cart and /checkout), so writing to it
// again here would race. WhatsAppButton/app-layout add this new variable
// as one more additive term instead.
export function MobilePurchaseBar({
  product,
  variant,
  attributeSelections,
  image,
  quantity,
  actualPrice,
  specialPrice,
  onBeforeAdd,
}: {
  product: Product;
  variant: ProductVariant | null;
  attributeSelections: AttributeSelection[];
  image: string | null;
  quantity: number;
  actualPrice: number;
  specialPrice: number | null;
  onBeforeAdd?: () => boolean;
}) {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    function update() {
      const height = el!.getBoundingClientRect().height;
      document.documentElement.style.setProperty(
        "--pdp-purchase-bar-height",
        height > 0 ? `${height}px` : "0px",
      );
    }
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty("--pdp-purchase-bar-height");
    };
  }, []);

  return (
    <div
      ref={barRef}
      className="fixed inset-x-0 z-[var(--z-sticky-bar)] flex items-center gap-3 border-t border-[var(--border)] bg-[var(--color-card)] px-4 py-3 shadow-[var(--shadow-card-hover)] md:hidden"
      style={{ bottom: "var(--mobile-nav-height, 0px)" }}
    >
      <div className="shrink-0">
        <PriceDisplay actualPrice={actualPrice} specialPrice={specialPrice} size="sm" />
      </div>
      <div className="flex-1">
        <AddToCartForm
          product={product}
          variant={variant}
          attributeSelections={attributeSelections}
          image={image}
          quantity={quantity}
          outOfStock={false}
          onBeforeAdd={onBeforeAdd}
        />
      </div>
    </div>
  );
}
