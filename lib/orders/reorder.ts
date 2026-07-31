"use server";

import { createClient } from "@/lib/supabase/server";
import type { CartItem } from "@/types";

export interface ReorderResult {
  items: CartItem[];
  unavailableCount: number;
}

// Re-adds a past order's items to the cart using CURRENT product data
// (price/stock/slug/image) — never the historical order price, same
// "product data is authoritative" rule already used everywhere else
// pricing is computed. Skips anything no longer orderable (deleted,
// unpublished, out of stock) rather than failing the whole reorder;
// caps quantity at whatever stock remains for the rest.
//
// RLS-scoped read only — order_items_select_own_or_admin already ensures
// this only ever returns rows for an order the caller owns.
export async function getReorderItems(orderId: string): Promise<ReorderResult | { error: string }> {
  const supabase = await createClient();

  const { data: orderItems, error } = await supabase
    .from("order_items")
    .select("product_id, quantity")
    .eq("order_id", orderId);

  if (error) return { error: error.message };
  if (!orderItems || orderItems.length === 0) return { items: [], unavailableCount: 0 };

  const productIds = orderItems
    .map((item) => item.product_id)
    .filter((id): id is string => Boolean(id));
  if (productIds.length === 0) return { items: [], unavailableCount: orderItems.length };

  const { data: products } = await supabase
    .from("products")
    .select("id, slug, name, actual_price, special_price, stock, is_deleted, status, product_images(image_url, sort_order)")
    .in("id", productIds)
    .order("sort_order", { foreignTable: "product_images" });

  const productMap = new Map((products ?? []).map((p) => [p.id, p]));
  const items: CartItem[] = [];
  let unavailableCount = 0;

  for (const orderItem of orderItems) {
    const product = orderItem.product_id ? productMap.get(orderItem.product_id) : undefined;
    if (!product || product.is_deleted || product.status !== "published" || product.stock <= 0) {
      unavailableCount += 1;
      continue;
    }
    items.push({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      price: product.special_price ?? product.actual_price,
      image: product.product_images?.[0]?.image_url ?? null,
      quantity: Math.min(orderItem.quantity, product.stock),
    });
  }

  return { items, unavailableCount };
}
