"use server";

import { createClient } from "@/lib/supabase/server";
import { getVariantPrice } from "@/lib/utils";
import { getActiveCampaignPricesForVariants } from "@/lib/data/campaigns";

export interface ProductSuggestion {
  id: string;
  slug: string;
  name: string;
  price: number;
  image: string | null;
}

export interface CategorySuggestion {
  slug: string;
  name: string;
}

export interface SearchSuggestions {
  products: ProductSuggestion[];
  categories: CategorySuggestion[];
  brands: string[];
}

const EMPTY_SUGGESTIONS: SearchSuggestions = { products: [], categories: [], brands: [] };

export async function getSearchSuggestions(query: string): Promise<SearchSuggestions> {
  const safe = query.trim();
  if (safe.length < 2) return EMPTY_SUGGESTIONS;

  const supabase = await createClient();
  const tsQuery = safe.split(/\s+/).filter(Boolean).join(" | ");

  const [{ data: products }, { data: categories }, { data: brandRows }] = await Promise.all([
    supabase
      .from("products")
      .select("id, slug, name")
      .eq("status", "published").eq("is_deleted", false)
      .textSearch("search_vector", tsQuery, { type: "plain", config: "english" })
      .limit(6),
    supabase.from("categories").select("slug, name").ilike("name", `%${safe}%`).limit(4),
    supabase.from("brands").select("name").eq("is_active", true).ilike("name", `%${safe}%`).limit(4),
  ]);

  const productIds = (products ?? []).map((p) => p.id);
  const imageByProductId = new Map<string, string>();
  const priceByProductId = new Map<string, number>();
  if (productIds.length > 0) {
    const [{ data: images }, { data: defaultVariants }] = await Promise.all([
      supabase
        .from("product_images")
        .select("product_id, image_url, sort_order")
        .in("product_id", productIds)
        .order("sort_order", { ascending: true }),
      supabase
        .from("product_variants")
        .select("id, product_id, regular_price, sale_price")
        .in("product_id", productIds)
        .eq("is_default", true),
    ]);
    for (const image of images ?? []) {
      if (!imageByProductId.has(image.product_id)) {
        imageByProductId.set(image.product_id, image.image_url);
      }
    }
    const defaultVariantIds = (defaultVariants ?? []).map((v) => v.id);
    const campaignPrices = await getActiveCampaignPricesForVariants(supabase, defaultVariantIds);
    for (const v of defaultVariants ?? []) {
      const c = campaignPrices.get(v.id);
      priceByProductId.set(v.product_id, getVariantPrice({ ...v, campaign_price: c?.campaignPrice ?? null }));
    }
  }

  const productSuggestions: ProductSuggestion[] = (products ?? []).map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    price: priceByProductId.get(p.id) ?? 0,
    image: imageByProductId.get(p.id) ?? null,
  }));

  return {
    products: productSuggestions,
    categories: (categories ?? []).map((c) => ({ slug: c.slug, name: c.name })),
    brands: (brandRows ?? []).map((b) => b.name),
  };
}
