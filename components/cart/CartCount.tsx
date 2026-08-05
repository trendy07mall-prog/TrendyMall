"use client";

import { useCart } from "@/context/CartContext";

// "header" (default) is every existing call site's exact current look —
// unchanged. "nav" is the bottom nav's spec: bigger, bolder, orange
// (--color-warning, #f97316). Text is black (#111111), not white — white
// on this orange measures 2.80:1, which fails WCAG AA at this text size
// (needs 4.5:1); black on the same orange measures 6.74:1. Both variants
// read the same useCart().count — there is only ever one number, just two
// ways of drawing it.
export function CartCount({ variant = "header" }: { variant?: "header" | "nav" }) {
  const { count } = useCart();
  if (count === 0) return null;

  if (variant === "nav") {
    return (
      <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-warning)] px-1 text-[11px] font-semibold text-[#111111]">
        {count}
      </span>
    );
  }

  return (
    <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--foreground)] px-1 text-[10px] font-medium text-white">
      {count}
    </span>
  );
}
