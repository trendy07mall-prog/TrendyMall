"use client";

import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { CartIcon } from "@/components/ui/Icon";
import { trackConversion } from "@/lib/analytics/track";
import type { ProductWithPrimaryImage } from "@/types";

const ADDING_MS = 350;
const ADDED_MS = 1200;

export function QuickAddButton({
  product,
  variant = "default",
  unavailableLabel = null,
}: {
  product: ProductWithPrimaryImage;
  // "shop" is the /shop redesign's taller/rounder button — opt-in only,
  // every other render site (category/search/PDP-related/homepage) keeps
  // today's sizing untouched.
  variant?: "default" | "shop";
  // Set only where the PAGE's own context makes buying from this card
  // wrong regardless of the product itself -- currently just a not-yet-
  // started (or already-ended) campaign's own landing page, where an
  // enabled "Add to Cart" would imply the campaign deal is purchasable
  // right now. Product-level reasons (out of stock) stay owned by this
  // component and take precedence, since they're the more specific truth
  // about that particular card. Omitted everywhere else, so every other
  // grid's button behaviour is unchanged.
  unavailableLabel?: string | null;
}) {
  const { addItem } = useCart();
  const [status, setStatus] = useState<"idle" | "adding" | "added">("idle");
  const outOfStock = product.stock <= 0;
  const unavailable = !outOfStock && unavailableLabel != null;

  function handleClick(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    setStatus("adding");
    setTimeout(() => {
      const price = product.special_price ?? product.actual_price;
      addItem({
        productId: product.id,
        slug: product.slug,
        name: product.name,
        price,
        image: product.image,
        quantity: 1,
        // Always the exact variant this card's price/image came from --
        // there's no color picker here, so this is the one the customer
        // saw and clicked "Add to Cart" on.
        variantId: product.defaultVariantId || null,
        variantName: null,
        variantColorHex: null,
        attributeSelections: [],
      });
      trackConversion("AddToCart", {
        productId: product.id,
        value: price,
        pixelParams: {
          content_ids: [product.id],
          content_name: product.name,
          content_type: "product",
          value: price,
          currency: "LKR",
        },
      });
      setStatus("added");
      setTimeout(() => setStatus("idle"), ADDED_MS);
    }, ADDING_MS);
  }

  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <button
      type="button"
      disabled={outOfStock || unavailable || status !== "idle"}
      onClick={handleClick}
      className={`transition-brand group-hover:bg-[var(--color-btn-hover)] flex w-full items-center justify-center gap-1.5 bg-[var(--foreground)] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40 ${
        variant === "shop"
          ? "h-12 rounded-[var(--radius-btn)] text-base"
          : "h-[42px] rounded-xl text-[15px] md:h-11"
      }`}
    >
      {outOfStock ? (
        "Out of stock"
      ) : unavailable ? (
        unavailableLabel
      ) : status === "adding" ? (
        reducedMotion ? (
          "Adding…"
        ) : (
          <>
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Adding…
          </>
        )
      ) : status === "added" ? (
        "Added ✓"
      ) : (
        <>
          <CartIcon className="h-4 w-4" />
          Add to Cart
        </>
      )}
    </button>
  );
}
