import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Category } from "@/types";

// depth: 0 restricts to top-level categories only (used by the homepage's
// "Explore by Category" carousel, which shouldn't flatten the whole tree).
// activeOnly defaults to true for storefront callers; the admin tree needs
// to see disabled categories too, so it passes false.
export async function getCategories(options?: {
  depth?: number;
  activeOnly?: boolean;
}): Promise<Category[]> {
  const supabase = await createClient();
  let query = supabase.from("categories").select("*").order("sort_order", { ascending: true });

  if (options?.depth != null) query = query.eq("depth", options.depth);
  if (options?.activeOnly ?? true) query = query.eq("is_active", true);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

// Wrapped in cache() -- app/category/[...slug]/page.tsx calls this once in
// generateMetadata and again in the page body with the same slug string;
// the second call returns the memoized result instead of re-querying.
export const getCategoryBySlug = cache(
  async (slug: string): Promise<Category | null> => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("categories")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    return data;
  },
);

export async function getCategoryById(id: string): Promise<Category | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  return data;
}

// Every category id in this category's own subtree (itself + all
// descendants), resolved via the indexed materialized-path prefix match —
// feeds straight into products' existing `.in("category_id", ids)` query
// pattern, so "show products from this category and every descendant" needs
// no change to the products table or query shape, just a wider id list.
export async function getDescendantCategoryIds(category: Category): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id")
    .like("path", `${category.path}.%`);

  if (error) throw error;
  return [category.id, ...(data ?? []).map((row) => row.id)];
}

// Top-level categories that actually have at least one real product --
// same "status='published' AND is_deleted=false" predicate used everywhere
// else products are counted (e.g. lib/data/products.ts's getFacetCounts).
// Products in this catalog are assigned to LEAF categories (e.g. "Power
// Bank", "Earbuds" a few levels under a top-level parent), never directly
// to the depth-0 category itself -- so a plain category_id match against
// only the depth-0 set would find zero products for every top-level
// category. Instead, every category's materialized `path` (dot-separated
// ancestor ids, own id last) is used to roll a leaf product up to its
// depth-0 ancestor (the path's first segment), same technique
// getDescendantCategoryIds uses in reverse. Used by the About page's "What
// We Sell" grid so an empty category never appears there.
export async function getCategoriesWithProducts(): Promise<Category[]> {
  const supabase = await createClient();

  const [
    { data: topLevel, error: topLevelError },
    { data: allCategories, error: allCategoriesError },
    { data: productRows, error: productsError },
  ] = await Promise.all([
    supabase.from("categories").select("*").eq("depth", 0).eq("is_active", true).order("sort_order", { ascending: true }),
    supabase.from("categories").select("id, path"),
    supabase.from("products").select("category_id").eq("status", "published").eq("is_deleted", false),
  ]);

  if (topLevelError) throw topLevelError;
  if (allCategoriesError) throw allCategoriesError;
  if (productsError) throw productsError;

  const topLevelAncestorById = new Map<string, string>();
  for (const c of allCategories ?? []) {
    topLevelAncestorById.set(c.id, c.path.split(".")[0]);
  }

  const countByTopLevelId = new Map<string, number>();
  for (const row of productRows ?? []) {
    const topLevelId = topLevelAncestorById.get(row.category_id);
    if (!topLevelId) continue;
    countByTopLevelId.set(topLevelId, (countByTopLevelId.get(topLevelId) ?? 0) + 1);
  }

  return (topLevel ?? []).filter((c) => (countByTopLevelId.get(c.id) ?? 0) > 0);
}

// Direct children only (not the whole subtree) -- used by the category page
// to show a "browse sub-categories" row above the product grid.
export async function getChildCategories(
  parentId: string,
  options?: { activeOnly?: boolean },
): Promise<Category[]> {
  const supabase = await createClient();
  let query = supabase
    .from("categories")
    .select("*")
    .eq("parent_id", parentId)
    .order("sort_order", { ascending: true });

  if (options?.activeOnly ?? true) query = query.eq("is_active", true);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

// Root-to-leaf ancestor chain (including the category itself), derived from
// its own materialized path -- powers breadcrumbs on both the category page
// and the product page without a recursive query.
export async function getCategoryAncestors(category: Category): Promise<Category[]> {
  const ids = category.path.split(".");
  if (ids.length <= 1) return [category];

  const supabase = await createClient();
  const { data, error } = await supabase.from("categories").select("*").in("id", ids);
  if (error) throw error;

  const byId = new Map((data ?? []).map((row) => [row.id, row]));
  return ids.map((id) => byId.get(id)).filter((row): row is Category => Boolean(row));
}

// Looks up a stale category slug in category_slug_redirects and returns the
// category's current active slug, or null if there's no redirect (or the
// category is no longer active). Same pattern as getProductSlugRedirect in
// lib/data/products.ts -- only called when a direct slug lookup misses.
export async function getCategorySlugRedirect(oldSlug: string): Promise<string | null> {
  const supabase = await createClient();
  const { data: redirect } = await supabase
    .from("category_slug_redirects")
    .select("category_id")
    .eq("old_slug", oldSlug)
    .maybeSingle();

  if (!redirect) return null;

  const { data: category } = await supabase
    .from("categories")
    .select("slug")
    .eq("id", redirect.category_id)
    .eq("is_active", true)
    .maybeSingle();

  return category?.slug ?? null;
}
