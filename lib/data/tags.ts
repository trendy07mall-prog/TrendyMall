import { createClient } from "@/lib/supabase/server";
import type { Tag } from "@/types";

// activeOnly defaults to true for storefront callers; admin views need to
// see disabled tags too, so they pass false. Mirrors getBrands.
export async function getTags(options?: { activeOnly?: boolean }): Promise<Tag[]> {
  const supabase = await createClient();
  let query = supabase.from("tags").select("*").order("sort_order", { ascending: true });

  if (options?.activeOnly ?? true) query = query.eq("is_active", true);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getTagBySlug(slug: string): Promise<Tag | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("tags").select("*").eq("slug", slug).maybeSingle();
  return data;
}

// Active tags on one product, for storefront display (PDP tag list) --
// unlike getProductTagIds, this returns display data (name/slug) already
// joined, and filters out inactive tags the same way attachPrimaryImages
// does for product-list surfaces.
export async function getProductTags(productId: string): Promise<{ name: string; slug: string }[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_tags")
    .select("tags(name, slug, is_active)")
    .eq("product_id", productId);

  if (error) throw error;
  return (data ?? [])
    .map((row) => row.tags as unknown as { name: string; slug: string; is_active: boolean } | null)
    .filter((tag): tag is { name: string; slug: string; is_active: boolean } => Boolean(tag?.is_active))
    .map((tag) => ({ name: tag.name, slug: tag.slug }));
}

// Used by the product form to pre-check the right boxes when editing.
export async function getProductTagIds(productId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_tags")
    .select("tag_id")
    .eq("product_id", productId);

  if (error) throw error;
  return (data ?? []).map((row) => row.tag_id);
}

// Every product id tagged with any of the given tag ids -- feeds straight
// into products' existing `.in("id", ids)` query pattern, the same way
// /search's restrictToIds mechanism already works.
export async function getProductIdsForTags(tagIds: string[]): Promise<string[]> {
  if (tagIds.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_tags")
    .select("product_id")
    .in("tag_id", tagIds);

  if (error) throw error;
  return [...new Set((data ?? []).map((row) => row.product_id))];
}
