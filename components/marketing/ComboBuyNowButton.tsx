"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { trackConversion } from "@/lib/analytics/track";
import type { ProductWithPrimaryImage } from "@/types";

// "Buy Now" on a Combo Deals card: add this bundle to the cart, then go
// straight to checkout.
//
// The add itself is deliberately the SAME shape QuickAddButton already
// uses for every other card -- the same price rule, the same quantity of
// one, the same defaultVariantId, and the same single trackConversion
// call with the same parameters. Nothing new is invented, so the Meta
// pixel sees exactly one AddToCart with exactly the payload it has
// always had for a card.
//
// QuickAddButton itself is not touched or reused: it is the "Add to
// Cart" button on every other grid in the shop, and this needs a
// different label, different styling and a redirect afterwards. Widening
// it would have changed a component every product card in the shop
// renders, which is out of scope here.
export function ComboBuyNowButton({
  product,
  available,
  className,
  style,
}: {
  product: ProductWithPrimaryImage;
  // Already decided by the caller from product.stock, which for a bundle
  // is how many can really be sold (sql/089) and drops to 0 when
  // anything inside cannot be sold (sql/091).
  available: boolean;
  className?: string;
  // Size and shape only. The colours stay owned by this component so
  // "orange means buy" and "grey means you cannot" can never be
  // overridden by a caller.
  style?: React.CSSProperties;
}) {
  const { addItem } = useCart();
  const router = useRouter();
  // Guards the window between the click and the route change: without
  // it a double-click would add twice and fire the pixel twice.
  const [busy, setBusy] = useState(false);

  if (!available) {
    return (
      <button
        type="button"
        disabled
        aria-label={`${product.name} is out of stock`}
        className={`${className ?? ""} inline-flex items-center justify-center cursor-not-allowed`}
        style={{ ...style, backgroundColor: "#E5E7EB", color: "#6B7280" }}
      >
        Out of stock
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={busy}
      aria-label={`Buy ${product.name} now`}
      onClick={() => {
        if (busy) return;
        setBusy(true);
        const price = product.special_price ?? product.actual_price;
        addItem({
          productId: product.id,
          slug: product.slug,
          name: product.name,
          price,
          image: product.image,
          quantity: 1,
          // The exact option this card priced -- a bundle has only one,
          // and it is the one carrying the bundle price.
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
        router.push("/checkout");
      }}
      className={`${className ?? ""} inline-flex items-center justify-center text-white transition-opacity hover:opacity-90 disabled:opacity-70 focus-visible:ring-2 focus-visible:ring-[#0F2D52] focus-visible:ring-offset-2 focus-visible:outline-none`}
      style={{ ...style, backgroundColor: "#F97316" }}
    >
      {busy ? "Adding…" : "Buy Now"}
    </button>
  );
}
