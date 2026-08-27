"use client";

import { useEffect, useRef } from "react";
import { AddToCartForm } from "@/components/product/AddToCartForm";
import { BuyNowButton } from "@/components/product/BuyNowButton";
import { formatPrice } from "@/lib/utils";
import type { AttributeSelection, Product, ProductVariant } from "@/types";

// Compact: min-h-11 (44px) is this site's own established minimum tap
// target (same as the bottom nav's Link areas), not a new number -- moderately
// smaller than the previous min-h-12 (48px) without going below it.
const BUTTON_CLASS_PRIMARY =
  "flex min-h-11 w-full items-center justify-center rounded-[var(--radius-btn)] bg-[var(--foreground)] px-2 text-[13px] font-semibold text-white transition-transform hover:scale-[1.02] disabled:opacity-40";
const BUTTON_CLASS_SECONDARY =
  "flex min-h-11 w-full items-center justify-center rounded-[var(--radius-btn)] border border-[var(--foreground)] px-2 text-[13px] font-semibold transition-colors hover:bg-black/5 disabled:opacity-40";

// Appears once the real in-page purchase controls (ProductPurchaseSection's
// quantity/Add to Cart/Buy Now block) scroll out of view -- driven by an
// IntersectionObserver in the parent, not a scroll-position calculation.
// Renders the actual AddToCartForm/BuyNowButton components (same
// addItem/router.push calls, same onBeforeAdd validation) rather than
// reimplementing the purchase flow, so there is exactly one code path for
// "add to cart" and one for "buy now" on this page.
export function FloatingPurchaseBar({
  visible,
  product,
  variant,
  attributeSelections,
  image,
  quantity,
  outOfStock,
  actualPrice,
  specialPrice,
  selectionError,
  onBeforeAdd,
}: {
  visible: boolean;
  product: Product;
  variant: ProductVariant | null;
  attributeSelections: AttributeSelection[];
  image: string | null;
  quantity: number;
  outOfStock: boolean;
  actualPrice: number;
  specialPrice: number | null;
  selectionError: string | null;
  onBeforeAdd?: () => boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Publishes into --pdp-floating-bar-height only while logically visible --
  // the element stays mounted throughout the slide/fade transition (so it
  // can animate), so "is it in the DOM" isn't the right signal for whether
  // the WhatsApp FAB and page padding should make room for it. A brand-new
  // variable name, not the --pdp-purchase-bar-height the earlier (now fully
  // removed) always-on sticky bar used -- that one had a different
  // visibility model and was cleaned up completely, nothing to collide with.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    function publish() {
      const height = visible ? (el?.getBoundingClientRect().height ?? 0) : 0;
      document.documentElement.style.setProperty(
        "--pdp-floating-bar-height",
        height > 0 ? `${height}px` : "0px",
      );
    }
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(el);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty("--pdp-floating-bar-height");
    };
  }, [visible]);

  return (
    <div
      ref={ref}
      aria-hidden={!visible}
      className={`fixed inset-x-4 z-[var(--z-whatsapp)] flex flex-col gap-1.5 rounded-[var(--radius-lg)] border border-[var(--border)] bg-white p-2.5 shadow-[var(--shadow-card-hover)] transition-[transform,opacity] duration-[220ms] ease-in-out motion-reduce:transition-none md:hidden ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
      }`}
      style={{ bottom: "calc(var(--mobile-nav-height, 0px) + 14px)" }}
    >
      {selectionError && (
        <p role="alert" className="text-xs font-medium text-[var(--color-discount)]">
          {selectionError}
        </p>
      )}
      <div className="flex items-center gap-1.5">
        {/* A compact single-line current price, not the full PriceDisplay
            (strikethrough + badge) -- that needs ~170px at this font size,
            which left the two buttons too narrow for their own labels and
            caused text to wrap and overflow their fixed height. Still the
            exact same actualPrice/specialPrice props as the in-page
            PriceDisplay, so it's real, synced data, just less verbose. */}
        <span className="shrink-0 text-sm font-bold whitespace-nowrap">
          {formatPrice(specialPrice ?? actualPrice)}
        </span>
        <div className="flex flex-1 items-center gap-1.5">
          <AddToCartForm
            product={product}
            variant={variant}
            attributeSelections={attributeSelections}
            image={image}
            quantity={quantity}
            outOfStock={outOfStock}
            onBeforeAdd={onBeforeAdd}
            className={BUTTON_CLASS_PRIMARY}
          />
          <BuyNowButton
            product={product}
            variant={variant}
            attributeSelections={attributeSelections}
            image={image}
            quantity={quantity}
            outOfStock={outOfStock}
            onBeforeAdd={onBeforeAdd}
            className={BUTTON_CLASS_SECONDARY}
          />
        </div>
      </div>
    </div>
  );
}
