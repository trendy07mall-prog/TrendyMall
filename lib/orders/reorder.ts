"use server";

import { createClient } from "@/lib/supabase/server";
import { getEffectiveVariantPrice } from "@/lib/utils";
import type { AttributeSelection, CartItem } from "@/types";

export interface ReorderResult {
  items: CartItem[];
  unavailableCount: number;
}

// Re-adds a past order's items to the cart using CURRENT product/variant
// data (price/stock/slug/image) — never the historical order price, same
// "product data is authoritative" rule already used everywhere else
// pricing is computed. Skips anything no longer orderable (deleted,
// unpublished, out of stock) rather than failing the whole reorder;
// caps quantity at whatever stock remains for the rest. If the variant
// that was originally ordered has since been deleted, falls back to the
// base product rather than dropping the line (order_items.variant_id is
// ON DELETE SET NULL for exactly this case).
//
// RLS-scoped read only — order_items_select_own_or_admin already ensures
// this only ever returns rows for an order the caller owns.
export async function getReorderItems(orderId: string): Promise<ReorderResult | { error: string }> {
  const supabase = await createClient();

  const { data: orderItems, error } = await supabase
    .from("order_items")
    .select("product_id, variant_id, quantity, attribute_selections")
    .eq("order_id", orderId);

  if (error) return { error: error.message };
  if (!orderItems || orderItems.length === 0) return { items: [], unavailableCount: 0 };

  const productIds = orderItems
    .map((item) => item.product_id)
    .filter((id): id is string => Boolean(id));
  if (productIds.length === 0) return { items: [], unavailableCount: orderItems.length };

  const variantIds = orderItems
    .map((item) => item.variant_id)
    .filter((id): id is string => Boolean(id));

  const [{ data: products }, { data: variants }] = await Promise.all([
    supabase
      .from("products")
      .select("id, slug, name, actual_price, special_price, stock, is_deleted, status, product_images(image_url, sort_order)")
      .in("id", productIds)
      .order("sort_order", { foreignTable: "product_images" }),
    variantIds.length > 0
      ? supabase.from("product_variants").select("id, color_name, color_hex, price, stock").in("id", variantIds)
      : Promise.resolve({ data: [] as { id: string; color_name: string; color_hex: string; price: number | null; stock: number | null }[] }),
  ]);

  const productMap = new Map((products ?? []).map((p) => [p.id, p]));
  const variantMap = new Map((variants ?? []).map((v) => [v.id, v]));
  const items: CartItem[] = [];
  let unavailableCount = 0;

  for (const orderItem of orderItems) {
    const product = orderItem.product_id ? productMap.get(orderItem.product_id) : undefined;
    if (!product || product.is_deleted || product.status !== "published" || product.stock <= 0) {
      unavailableCount += 1;
      continue;
    }
    const variant = orderItem.variant_id ? (variantMap.get(orderItem.variant_id) ?? null) : null;
    const effectiveStock = variant?.stock ?? product.stock;
    items.push({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      price: getEffectiveVariantPrice(product, variant),
      image: product.product_images?.[0]?.image_url ?? null,
      quantity: Math.min(orderItem.quantity, effectiveStock),
      variantId: variant?.id ?? null,
      variantName: variant?.color_name ?? null,
      variantColorHex: variant?.color_hex ?? null,
      attributeSelections: (orderItem.attribute_selections as AttributeSelection[] | null) ?? [],
    });
  }

  return { items, unavailableCount };
}
