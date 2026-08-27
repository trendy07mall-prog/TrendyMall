"use client";

import { useCart } from "@/context/CartContext";

// "header" (default) is every existing call site's exact current look —
// unchanged. "nav" is the bottom nav's spec: bigger, bolder, orange
// (--color-warning, #f97316). Text is black (#111111), not white — white
// on this orange measures 2.80:1, which fails WCAG AA at this text size
// (needs 4.5:1); black on the same orange measures 6.74:1. Both variants
// read the same useCart().count — there is only ever one number, just two
// ways of drawing it.
export function CartCount({
  variant = "header",
  compact = false,
}: {
  variant?: "header" | "nav";
  // nav-only: the product page's scrolled-down bottom nav shrinks slightly
  // (see MobileBottomNavClient.tsx) -- the badge scales down with it so it
  // stays proportional to the now-smaller icon instead of looking oversized.
  compact?: boolean;
}) {
  const { count } = useCart();
  if (count === 0) return null;

  if (variant === "nav") {
    // -top-1/-right-1 sat the badge almost dead center over the 20px icon
    // (badge and icon are nearly the same size) -- pushed further out so
    // only the badge's own corner clips the icon's corner, the standard
    // badge look, same color/count/size otherwise.
    return (
      <span
        className={`absolute flex items-center justify-center rounded-full bg-[var(--color-warning)] px-1 font-semibold text-[#111111] transition-[width,height,top,right] duration-200 ease-in-out motion-reduce:transition-none ${
          compact ? "-top-1.5 -right-1.5 h-4 min-w-4 text-[10px]" : "-top-2 -right-2 h-5 min-w-5 text-[11px]"
        }`}
      >
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
