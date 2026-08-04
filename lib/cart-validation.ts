"use server";

import { createClient } from "@/lib/supabase/server";
import { getEffectiveVariantPrice } from "@/lib/utils";

export interface CartItemValidation {
  productId: string;
  variantId: string | null;
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
  items: { productId: string; variantId: string | null; price: number; quantity: number }[],
): Promise<CartItemValidation[]> {
  if (items.length === 0) return [];

  const supabase = await createClient();
  const variantIds = items.map((i) => i.variantId).filter((id): id is string => id !== null);
  const [{ data: products }, { data: variants }] = await Promise.all([
    supabase
      .from("products")
      .select("id, actual_price, special_price, stock, is_deleted, status")
      .in(
        "id",
        items.map((i) => i.productId),
      ),
    variantIds.length > 0
      ? supabase.from("product_variants").select("id, price, stock").in("id", variantIds)
      : Promise.resolve({ data: [] as { id: string; price: number | null; stock: number | null }[] }),
  ]);

  const byId = new Map((products ?? []).map((p) => [p.id, p]));
  const variantById = new Map((variants ?? []).map((v) => [v.id, v]));

  return items.map((item) => {
    const product = byId.get(item.productId);
    if (!product || product.is_deleted || product.status !== "published") {
      return {
        productId: item.productId,
        variantId: item.variantId,
        available: false,
        currentPrice: null,
        currentStock: 0,
        priceChanged: false,
      };
    }

    const variant = item.variantId ? (variantById.get(item.variantId) ?? null) : null;
    const currentPrice = getEffectiveVariantPrice(product, variant);
    const currentStock = variant?.stock ?? product.stock;
    return {
      productId: item.productId,
      variantId: item.variantId,
      available: currentStock > 0,
      currentPrice,
      currentStock,
      priceChanged: Math.abs(currentPrice - item.price) > 0.01,
    };
  });
}
