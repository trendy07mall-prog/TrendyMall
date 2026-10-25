"use client";

import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { CartIcon, CheckIcon } from "@/components/ui/Icon";
import { trackConversion } from "@/lib/analytics/track";
import type { ProductWithPrimaryImage } from "@/types";

const ADDING_MS = 350;
const ADDED_MS = 1200;

export function QuickAddButton({
  product,
  variant = "default",
  shape = "bar",
  unavailableLabel = null,
}: {
  product: ProductWithPrimaryImage;
  // "shop" is the /shop redesign's taller/rounder button — opt-in only,
  // every other render site (category/search/PDP-related/homepage) keeps
  // today's sizing untouched.
  variant?: "default" | "shop";
  // "round" is the icon-only orange button beside the price on a campaign
  // card (CampaignProductCard); its label goes in aria-label instead.
  shape?: "bar" | "round";
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
  // Right for a bundle as well: sql/089 keeps a bundle's stock equal to
  // how many whole bundles its contents allow, so this one check covers
  // both kinds of product.
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

  const disabled = outOfStock || unavailable || status !== "idle";

  if (shape === "round") {
    const label = outOfStock
      ? "Out of stock"
      : unavailable
        ? unavailableLabel!
        : status === "adding"
          ? "Adding to cart"
          : status === "added"
            ? "Added to cart"
            : `Add ${product.name} to cart`;
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={handleClick}
        aria-label={label}
        title={outOfStock || unavailable ? label : undefined}
        // Colours in globals.css (.campaign-cart) so dark mode keeps them.
        className="campaign-cart transition-brand flex h-11 w-11 shrink-0 items-center justify-center rounded-full disabled:cursor-not-allowed disabled:opacity-40"
      >
        {status === "adding" && !reducedMotion ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/25 border-t-[#111111]" />
        ) : status === "added" ? (
          <CheckIcon className="h-5 w-5" />
        ) : (
          <CartIcon className="h-5 w-5" />
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={handleClick}
      className={`transition-brand flex w-full items-center justify-center gap-1.5 bg-[var(--foreground)] font-semibold text-white group-hover:bg-[var(--color-btn-hover)] disabled:cursor-not-allowed disabled:opacity-40 ${
        variant === "shop" ? "h-12 rounded-[var(--radius-btn)] text-base" : "h-[42px] rounded-xl text-[15px] md:h-11"
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
