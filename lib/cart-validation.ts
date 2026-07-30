"use server";

import { createClient } from "@/lib/supabase/server";
import { getEffectivePrice } from "@/lib/utils";

export interface CartItemValidation {
  productId: string;
  available: boolean;
  currentPrice: number | null;
  currentStock: number;
  priceChanged: boolean;
}

// Read-only, public RLS (same as every other storefront product query) —
// no admin gate needed. Batches one query for every product id currently
// in the cart, rather than one round trip per line item. This is the
// "lighter version" of Phase 4's full persisted-cart re-validation: it
// drives Phase 1's stock badges and the out-of-stock checkout block now,
// and gets reused (not duplicated) when Phase 4 adds full persistence.
export async function getCartValidation(
  items: { productId: string; price: number; quantity: number }[],
): Promise<CartItemValidation[]> {
  if (items.length === 0) return [];

  const supabase = await createClient();
  const { data: products } = await supabase
    .from("products")
    .select("id, actual_price, special_price, stock, is_deleted, status")
    .in(
      "id",
      items.map((i) => i.productId),
    );

  const byId = new Map((products ?? []).map((p) => [p.id, p]));

  return items.map((item) => {
    const product = byId.get(item.productId);
    if (!product || product.is_deleted || product.status !== "published") {
      return {
        productId: item.productId,
        available: false,
        currentPrice: null,
        currentStock: 0,
        priceChanged: false,
      };
    }

    const currentPrice = getEffectivePrice(product);
    return {
      productId: item.productId,
      available: product.stock > 0,
      currentPrice,
      currentStock: product.stock,
      priceChanged: Math.abs(currentPrice - item.price) > 0.01,
    };
  });
}
