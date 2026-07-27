"use server";

import { createClient } from "@/lib/supabase/server";
import { getEffectivePrice } from "@/lib/utils";

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
      .select("id, slug, name, actual_price, special_price")
      .eq("status", "published").eq("is_deleted", false)
      .textSearch("search_vector", tsQuery, { type: "plain", config: "english" })
      .limit(6),
    supabase.from("categories").select("slug, name").ilike("name", `%${safe}%`).limit(4),
    supabase
      .from("products")
      .select("brand")
      .eq("status", "published").eq("is_deleted", false)
      .not("brand", "is", null)
      .ilike("brand", `%${safe}%`)
      .limit(20),
  ]);

  const productIds = (products ?? []).map((p) => p.id);
  const imageByProductId = new Map<string, string>();
  if (productIds.length > 0) {
    const { data: images } = await supabase
      .from("product_images")
      .select("product_id, image_url, sort_order")
      .in("product_id", productIds)
      .order("sort_order", { ascending: true });
    for (const image of images ?? []) {
      if (!imageByProductId.has(image.product_id)) {
        imageByProductId.set(image.product_id, image.image_url);
      }
    }
  }

  const productSuggestions: ProductSuggestion[] = (products ?? []).map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    price: getEffectivePrice(p),
    image: imageByProductId.get(p.id) ?? null,
  }));

  const brandSet = new Set<string>();
  for (const row of brandRows ?? []) {
    if (row.brand) brandSet.add(row.brand);
  }

  return {
    products: productSuggestions,
    categories: (categories ?? []).map((c) => ({ slug: c.slug, name: c.name })),
    brands: [...brandSet].slice(0, 4),
  };
}
