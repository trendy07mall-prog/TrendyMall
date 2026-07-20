"use client";

import { useWishlist } from "@/context/WishlistContext";

export function WishlistCount() {
  const { count } = useWishlist();
  if (count === 0) return null;
  return (
    <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--foreground)] px-1 text-[10px] font-medium text-white">
      {count}
    </span>
  );
}
