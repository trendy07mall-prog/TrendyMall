"use client";

import { useCart } from "@/context/CartContext";

export function CartCount() {
  const { count } = useCart();
  if (count === 0) return null;
  return <span className="text-xs">({count})</span>;
}
