"use server";

import { createClient } from "@/lib/supabase/server";
import { getVariantPrice } from "@/lib/utils";
import { getActiveCampaignPricesForVariants } from "@/lib/data/campaigns";
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

  const [{ data: products }, { data: variants }, { data: defaultVariants }] = await Promise.all([
    supabase
      .from("products")
      .select("id, slug, name, stock, is_deleted, status, product_images(image_url, sort_order)")
      .in("id", productIds)
      .order("sort_order", { foreignTable: "product_images" }),
    variantIds.length > 0
      ? supabase
          .from("product_variants")
          .select("id, color_name, color_hex, regular_price, sale_price, stock")
          .in("id", variantIds)
      : Promise.resolve({
          data: [] as {
            id: string;
            color_name: string | null;
            color_hex: string | null;
            regular_price: number;
            sale_price: number | null;
            stock: number | null;
          }[],
        }),
    // The order predates variants entirely, or the original variant was
    // since deleted (order_items.variant_id is ON DELETE SET NULL) --
    // falls back to the product's current default variant rather than a
    // product-level price that no longer exists.
    supabase
      .from("product_variants")
      .select("id, product_id, color_name, color_hex, regular_price, sale_price, stock")
      .in("product_id", productIds)
      .eq("is_default", true),
  ]);

  const fetchedVariantIds = [
    ...(variants ?? []).map((v) => v.id),
    ...(defaultVariants ?? []).map((v) => v.id),
  ];
  const campaignPrices = await getActiveCampaignPricesForVariants(supabase, fetchedVariantIds);
  const withCampaign = <T extends { id: string }>(v: T) => {
    const c = campaignPrices.get(v.id);
    return { ...v, campaign_price: c?.campaignPrice ?? null, campaign_id: c?.campaignId ?? null };
  };

  const productMap = new Map((products ?? []).map((p) => [p.id, p]));
  const variantMap = new Map((variants ?? []).map((v) => [v.id, withCampaign(v)]));
  const defaultVariantByProductId = new Map(
    (defaultVariants ?? []).map((v) => [v.product_id, withCampaign(v)]),
  );
  const items: CartItem[] = [];
  let unavailableCount = 0;

  for (const orderItem of orderItems) {
    const product = orderItem.product_id ? productMap.get(orderItem.product_id) : undefined;
    if (!product || product.is_deleted || product.status !== "published" || product.stock <= 0) {
      unavailableCount += 1;
      continue;
    }
    const variant = orderItem.variant_id
      ? (variantMap.get(orderItem.variant_id) ?? defaultVariantByProductId.get(product.id))
      : defaultVariantByProductId.get(product.id);
    if (!variant) {
      unavailableCount += 1;
      continue;
    }
    const effectiveStock = variant.stock ?? product.stock;
    items.push({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      price: getVariantPrice(variant),
      image: product.product_images?.[0]?.image_url ?? null,
      quantity: Math.min(orderItem.quantity, effectiveStock),
      variantId: variant.id,
      variantName: variant.color_name,
      variantColorHex: variant.color_hex,
      attributeSelections: (orderItem.attribute_selections as AttributeSelection[] | null) ?? [],
    });
  }

  return { items, unavailableCount };
}
