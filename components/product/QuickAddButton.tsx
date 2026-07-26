"use client";

import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { getEffectivePrice } from "@/lib/utils";
import { CartIcon } from "@/components/ui/Icon";
import type { ProductWithPrimaryImage } from "@/types";

const ADDING_MS = 350;
const ADDED_MS = 1200;

export function QuickAddButton({ product }: { product: ProductWithPrimaryImage }) {
  const { addItem } = useCart();
  const [status, setStatus] = useState<"idle" | "adding" | "added">("idle");
  const outOfStock = product.stock <= 0;

  function handleClick(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    setStatus("adding");
    setTimeout(() => {
      addItem({
        productId: product.id,
        slug: product.slug,
        name: product.name,
        price: getEffectivePrice(product),
        image: product.image,
        quantity: 1,
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
      disabled={outOfStock || status !== "idle"}
      onClick={handleClick}
      className="transition-brand group-hover:bg-[var(--color-btn-hover)] flex w-full items-center justify-center gap-1.5 rounded-full bg-[var(--foreground)] py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
    >
      {outOfStock ? (
        "Out of stock"
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
