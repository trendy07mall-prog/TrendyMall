"use server";

import { createClient } from "@/lib/supabase/server";
import { getVariantPrice } from "@/lib/utils";
import { getActiveCampaignPricesForVariants, hasActiveFreeShippingCampaign } from "@/lib/data/campaigns";

export interface CartItemValidation {
  productId: string;
  variantId: string | null;
  available: boolean;
  currentPrice: number | null;
  currentStock: number;
  priceChanged: boolean;
  // Non-null only when THIS SPECIFIC variant is currently joined to an
  // active campaign -- checked at the variant level (the same
  // getActiveCampaignPricesForVariants map this function already builds
  // for currentPrice, not a second calculation path), so two cart lines
  // for the same product can correctly show the badge on only one of them.
  campaignName: string | null;
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
  const productIds = items.map((i) => i.productId);
  const variantIds = items.map((i) => i.variantId).filter((id): id is string => id !== null);
  const [{ data: products }, { data: variants }, { data: defaultVariants }] = await Promise.all([
    supabase.from("products").select("id, stock, is_deleted, status").in("id", productIds),
    variantIds.length > 0
      ? supabase.from("product_variants").select("id, regular_price, sale_price, stock").in("id", variantIds)
      : Promise.resolve({
          data: [] as { id: string; regular_price: number; sale_price: number | null; stock: number | null }[],
        }),
    // A line with no variantId (a pre-migration or otherwise stale cart
    // line) falls back to the product's default variant instead of a
    // product-level price that no longer exists.
    supabase
      .from("product_variants")
      .select("id, product_id, regular_price, sale_price, stock")
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

  const byId = new Map((products ?? []).map((p) => [p.id, p]));
  const variantById = new Map((variants ?? []).map((v) => [v.id, withCampaign(v)]));
  const defaultVariantByProductId = new Map(
    (defaultVariants ?? []).map((v) => [v.product_id, withCampaign(v)]),
  );

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
        campaignName: null,
      };
    }

    const variant = item.variantId
      ? (variantById.get(item.variantId) ?? defaultVariantByProductId.get(item.productId))
      : defaultVariantByProductId.get(item.productId);
    if (!variant) {
      return {
        productId: item.productId,
        variantId: item.variantId,
        available: false,
        currentPrice: null,
        currentStock: 0,
        priceChanged: false,
        campaignName: null,
      };
    }
    const currentPrice = getVariantPrice(variant);
    const currentStock = variant.stock ?? product.stock;
    return {
      productId: item.productId,
      variantId: item.variantId,
      available: currentStock > 0,
      currentPrice,
      currentStock,
      priceChanged: Math.abs(currentPrice - item.price) > 0.01,
      campaignName: campaignPrices.get(variant.id)?.campaignName ?? null,
    };
  });
}

// Whether the cart's current contents unlock free shipping via an active
// campaign -- checked by both /cart (display) and checkout (authoritative
// preview, mirrored again server-side in create_order_atomic which is the
// real source of truth). Thin wrapper so client components never import
// lib/data/campaigns (a server-only module) directly.
export async function getCartFreeShipping(variantIds: (string | null)[]): Promise<boolean> {
  const ids = variantIds.filter((id): id is string => !!id);
  if (ids.length === 0) return false;
  const supabase = await createClient();
  return hasActiveFreeShippingCampaign(supabase, ids);
}
