"use client";

import { useWishlist } from "@/context/WishlistContext";
import { SummaryCardShell } from "@/components/account/SummaryCardShell";
import { HeartIcon } from "@/components/ui/Icon";

// The only Overview summary card that's client-rendered — wishlist state
// is localStorage (context/WishlistContext.tsx), not a DB table, so there's
// nothing to read server-side. Count is 0 on first paint (matches the
// server render, avoiding a hydration mismatch — same pattern as
// components/cart/WishlistCount.tsx) then updates right after mount.
export function WishlistSummaryCard() {
  const { count } = useWishlist();
  return (
    <SummaryCardShell
      icon={<HeartIcon className="h-4 w-4" />}
      label="Wishlist"
      count={count}
      href="/account/wishlist"
    />
  );
}
