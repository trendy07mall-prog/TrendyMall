"use client";

import { useCart } from "@/context/CartContext";

// "header" (default) is every existing call site's exact current look —
// unchanged. "nav" is the bottom nav's spec: bigger, bolder, and red
// (#dc2626, not the lighter --color-discount, since a small badge with
// white text needs the darker shade to stay legible at this size). Both
// variants read the same useCart().count — there is only ever one number,
// just two ways of drawing it.
export function CartCount({ variant = "header" }: { variant?: "header" | "nav" }) {
  const { count } = useCart();
  if (count === 0) return null;

  if (variant === "nav") {
    return (
      <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#dc2626] px-1 text-[11px] font-semibold text-white">
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
