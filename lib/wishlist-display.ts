"use server";

import { getProductsByIds } from "@/lib/data/products";
import type { ProductWithPrimaryImage } from "@/types";

// A "use server" file, not a plain call into lib/data/products.ts -- the
// wishlist page that calls this is a client component (it reads
// useWishlist()), and that file's server-only helpers can't be imported
// into client code (same constraint lib/cart-recommendations.ts already
// works around for the cart page). Wishlist state itself (add/remove/
// localStorage) is untouched by this file -- it only hydrates the product
// ids the wishlist already has into full, current card data so the shared
// ProductCard can render them. getProductsByIds already preserves input
// order and silently drops anything unpublished/deleted since being
// wishlisted, same as its other callers (campaign pages, homepage
// campaign sections).
export async function getWishlistProducts(productIds: string[]): Promise<ProductWithPrimaryImage[]> {
  return getProductsByIds(productIds);
}
