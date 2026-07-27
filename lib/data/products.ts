import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { ProductListFilters } from "@/lib/product-filters";
import type { Product, ProductImage, ProductVariant, ProductWithPrimaryImage } from "@/types";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

async function attachPrimaryImages(
  supabase: SupabaseServerClient,
  products: Product[],
): Promise<ProductWithPrimaryImage[]> {
  if (products.length === 0) return [];

  const ids = products.map((p) => p.id);
  const [{ data: images, error: imagesError }, { data: ratings, error: ratingsError }] =
    await Promise.all([
      supabase
        .from("product_images")
        .select("product_id, image_url, sort_order")
        .in("product_id", ids)
        .order("sort_order", { ascending: true }),
      supabase
        .from("product_rating_summary")
        .select("product_id, avg_rating, review_count")
        .in("product_id", ids),
    ]);

  if (imagesError) throw imagesError;
  if (ratingsError) throw ratingsError;

  const primaryByProductId = new Map<string, string>();
  for (const image of images ?? []) {
    if (!primaryByProductId.has(image.product_id)) {
      primaryByProductId.set(image.product_id, image.image_url);
    }
  }

  const ratingByProductId = new Map(
    (ratings ?? []).map((r) => [r.product_id, r] as const),
  );

  return products.map((product) => {
    const rating = ratingByProductId.get(product.id);
    return {
      ...product,
      image: primaryByProductId.get(product.id) ?? null,
      avgRating: rating?.avg_rating ?? 0,
      reviewCount: rating?.review_count ?? 0,
    };
  });
}

// Applies every filter that maps directly to a WHERE-equivalent Supabase
// call. Sorting is deliberately NOT done here — see applyPostFilters below,
// which is the single place all six sort options are resolved, since two
// of them (highest_rated, best_selling) can't be pushed to SQL at all
// (avgRating lives in a view, sales in another) and for a store this size
// sorting the already-fetched array in JS is simpler than splitting the
// logic between SQL ORDER BY and a JS fallback.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyDbFilters(query: any, filters: ProductListFilters): any {
  let q = query;
  if (filters.categoryIds?.length) q = q.in("category_id", filters.categoryIds);
  if (filters.brands?.length) q = q.in("brand", filters.brands);
  if (filters.minPrice != null) q = q.gte("actual_price", filters.minPrice);
  if (filters.maxPrice != null) q = q.lte("actual_price", filters.maxPrice);
  if (filters.cod) q = q.eq("cod_available", true);
  if (filters.freeDelivery) q = q.eq("free_delivery", true);
  if (filters.warranty) q = q.eq("warranty_available", true);

  if (filters.inStock && !filters.outOfStock) q = q.gt("stock", 0);
  else if (filters.outOfStock && !filters.inStock) q = q.lte("stock", 0);

  const promoConditions: string[] = [];
  if (filters.onSale) promoConditions.push("special_price.not.is.null");
  if (filters.newArrival) {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    promoConditions.push(`created_at.gte.${cutoff}`);
  }
  if (filters.featured) promoConditions.push("is_featured.eq.true");
  if (promoConditions.length > 0) q = q.or(promoConditions.join(","));

  return q;
}

async function applyPostFilters(
  supabase: SupabaseServerClient,
  products: ProductWithPrimaryImage[],
  filters: ProductListFilters,
): Promise<ProductWithPrimaryImage[]> {
  const filtered =
    filters.minRating != null
      ? products.filter((p) => p.avgRating >= filters.minRating!)
      : products;

  if (filters.sort === "best_selling") {
    const ids = filtered.map((p) => p.id);
    const unitsSoldById = new Map<string, number>();
    if (ids.length > 0) {
      const { data: sales } = await supabase
        .from("product_sales_summary")
        .select("product_id, units_sold")
        .in("product_id", ids);
      for (const row of sales ?? []) unitsSoldById.set(row.product_id, row.units_sold);
    }
    return [...filtered].sort(
      (a, b) => (unitsSoldById.get(b.id) ?? 0) - (unitsSoldById.get(a.id) ?? 0),
    );
  }

  if (filters.sort === "highest_rated") {
    return [...filtered].sort((a, b) => b.avgRating - a.avgRating);
  }
  if (filters.sort === "most_popular") {
    return [...filtered].sort((a, b) => b.view_count - a.view_count);
  }
  if (filters.sort === "price_asc") {
    return [...filtered].sort((a, b) => a.actual_price - b.actual_price);
  }
  if (filters.sort === "price_desc") {
    return [...filtered].sort((a, b) => b.actual_price - a.actual_price);
  }
  return [...filtered].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export async function getProductsByCategory(
  categoryId: string,
  filters: ProductListFilters = { sort: "newest" },
): Promise<ProductWithPrimaryImage[]> {
  const supabase = await createClient();
  const { data, error } = await applyDbFilters(
    supabase
      .from("products")
      .select("*")
      .eq("category_id", categoryId)
      .eq("status", "published").eq("is_deleted", false),
    filters,
  );

  if (error) throw error;
  const withImages = await attachPrimaryImages(supabase, data);
  return applyPostFilters(supabase, withImages, filters);
}

export async function getAllProducts(
  filters: ProductListFilters = { sort: "newest" },
): Promise<ProductWithPrimaryImage[]> {
  const supabase = await createClient();
  const { data, error } = await applyDbFilters(
    supabase.from("products").select("*").eq("status", "published").eq("is_deleted", false),
    filters,
  );

  if (error) throw error;
  const withImages = await attachPrimaryImages(supabase, data);
  return applyPostFilters(supabase, withImages, filters);
}

export interface FacetCounts {
  categories: { slug: string; name: string; count: number }[];
  brands: { name: string; count: number }[];
}

// Counts reflect every ACTIVE filter except the facet's own selection (so
// checking a second brand doesn't make the first brand's count vanish) —
// computed by re-running the filtered query without that one facet and
// aggregating in JS, the same "small store, aggregate in code" approach
// already used for the admin dashboard's best-sellers list. `restrictToIds`
// (from a search match set) further narrows the candidate rows when called
// from /search.
export async function getFacetCounts(
  filters: ProductListFilters,
  options: { categoryId?: string; includeCategoryFacet?: boolean; restrictToIds?: string[] } = {},
): Promise<FacetCounts> {
  if (options.restrictToIds && options.restrictToIds.length === 0) {
    return { categories: [], brands: [] };
  }

  const supabase = await createClient();
  const filtersWithoutCategory: ProductListFilters = { ...filters, categoryIds: undefined };
  const filtersWithoutBrand: ProductListFilters = { ...filters, brands: undefined };

  let categories: FacetCounts["categories"] = [];
  if (options.includeCategoryFacet !== false) {
    let categoryCountQuery = supabase.from("products").select("category_id").eq("status", "published").eq("is_deleted", false);
    if (options.restrictToIds) categoryCountQuery = categoryCountQuery.in("id", options.restrictToIds);

    const [{ data: categoryRows }, { data: productRows }] = await Promise.all([
      supabase.from("categories").select("id, name, slug").order("sort_order"),
      applyDbFilters(categoryCountQuery, filtersWithoutCategory),
    ]);

    const countByCategoryId = new Map<string, number>();
    for (const row of productRows ?? []) {
      countByCategoryId.set(row.category_id, (countByCategoryId.get(row.category_id) ?? 0) + 1);
    }
    categories = (categoryRows ?? []).map((c) => ({
      slug: c.slug,
      name: c.name,
      count: countByCategoryId.get(c.id) ?? 0,
    }));
  }

  let brandQuery = supabase
    .from("products")
    .select("brand")
    .eq("status", "published").eq("is_deleted", false)
    .not("brand", "is", null);
  if (options.categoryId) brandQuery = brandQuery.eq("category_id", options.categoryId);
  if (options.restrictToIds) brandQuery = brandQuery.in("id", options.restrictToIds);
  const { data: brandRows } = await applyDbFilters(brandQuery, filtersWithoutBrand);

  const countByBrand = new Map<string, number>();
  for (const row of brandRows ?? []) {
    if (row.brand) countByBrand.set(row.brand, (countByBrand.get(row.brand) ?? 0) + 1);
  }
  const brands = [...countByBrand.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { categories, brands };
}

export async function getPublishedProductCount(categoryId?: string): Promise<number> {
  const supabase = await createClient();
  let query = supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("status", "published").eq("is_deleted", false);
  if (categoryId) query = query.eq("category_id", categoryId);

  const { count } = await query;
  return count ?? 0;
}

// Gates the Rating filter group and Highest Rated sort option — both stay
// hidden until at least one product anywhere has an approved review.
export async function hasAnyApprovedReviews(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.from("product_rating_summary").select("product_id").limit(1);
  return (data?.length ?? 0) > 0;
}

export async function incrementProductViewCount(productId: string): Promise<void> {
  const supabase = await createClient();
  try {
    await supabase.rpc("increment_product_view_count", { p_product_id: productId });
  } catch {
    // Best-effort — a failed view-count bump should never break the page.
  }
}

export async function getNewArrivals(limit = 8): Promise<ProductWithPrimaryImage[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("status", "published").eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return attachPrimaryImages(supabase, data);
}

// Full-text search (search_vector, a generated tsvector covering
// name/brand/sku/keywords/description — see sql/018) plus a separate
// category-name match, since a generated column can't join across tables to
// fold the category's name into the same tsvector. Exported so /search's
// page can also use it to scope facet counts to just the matching products.
export async function getSearchMatchIds(query: string): Promise<string[]> {
  const supabase = await createClient();
  const safe = query.trim();
  if (!safe) return [];

  const tsQuery = safe.split(/\s+/).filter(Boolean).join(" | ");

  const [{ data: ftsMatches }, { data: matchingCategories }] = await Promise.all([
    supabase
      .from("products")
      .select("id")
      .eq("status", "published").eq("is_deleted", false)
      .textSearch("search_vector", tsQuery, { type: "plain", config: "english" }),
    supabase.from("categories").select("id").ilike("name", `%${safe}%`),
  ]);

  const ids = new Set((ftsMatches ?? []).map((p) => p.id));

  const categoryIds = (matchingCategories ?? []).map((c) => c.id);
  if (categoryIds.length > 0) {
    const { data: categoryMatches } = await supabase
      .from("products")
      .select("id")
      .eq("status", "published").eq("is_deleted", false)
      .in("category_id", categoryIds);
    for (const p of categoryMatches ?? []) ids.add(p.id);
  }

  return [...ids];
}

// The match-id lookup keeps the rest of the pipeline identical to
// getAllProducts/getProductsByCategory — a plain `.in("id", ...)` composes
// cleanly with applyDbFilters' own promotion-group `.or()` call, avoiding
// any risk of stacking multiple unrelated `.or()` conditions in one query.
export async function searchProducts(
  query: string,
  filters: ProductListFilters = { sort: "newest" },
): Promise<ProductWithPrimaryImage[]> {
  const supabase = await createClient();
  const matchIds = await getSearchMatchIds(query);
  if (matchIds.length === 0) return [];

  const { data, error } = await applyDbFilters(
    supabase.from("products").select("*").eq("status", "published").eq("is_deleted", false).in("id", matchIds),
    filters,
  );
  if (error) throw error;

  const withImages = await attachPrimaryImages(supabase, data);
  return applyPostFilters(supabase, withImages, filters);
}

export async function getRelatedProducts(
  categoryId: string,
  excludeProductId: string,
  limit = 4,
): Promise<ProductWithPrimaryImage[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("category_id", categoryId)
    .eq("status", "published").eq("is_deleted", false)
    .neq("id", excludeProductId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return attachPrimaryImages(supabase, data);
}

// Looks up a stale product slug in product_slug_redirects and returns the
// product's current published slug, or null if there's no redirect (or the
// product is no longer published). Only called when a direct slug lookup
// misses, so a renamed/re-slugged product 301s to its new URL instead of
// 404ing.
export async function getProductSlugRedirect(oldSlug: string): Promise<string | null> {
  const supabase = await createClient();
  const { data: redirect } = await supabase
    .from("product_slug_redirects")
    .select("product_id")
    .eq("old_slug", oldSlug)
    .maybeSingle();

  if (!redirect) return null;

  const { data: product } = await supabase
    .from("products")
    .select("slug")
    .eq("id", redirect.product_id)
    .eq("status", "published").eq("is_deleted", false)
    .maybeSingle();

  return product?.slug ?? null;
}

export async function getAllProductSlugs(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("slug")
    .eq("status", "published").eq("is_deleted", false);

  if (error) throw error;
  return data.map((p) => p.slug);
}

export interface ProductDetail {
  product: Product;
  images: ProductImage[];
  variants: ProductVariant[];
}

// Wrapped in React's cache() so generateMetadata() and the page body (which
// both need this) share one set of queries per request instead of doubling
// them up.
export const getProductDetailBySlug = cache(
  async (slug: string): Promise<ProductDetail | null> => {
    const supabase = await createClient();
    const { data: product } = await supabase
      .from("products")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published").eq("is_deleted", false)
      .maybeSingle();

    if (!product) return null;

    const [{ data: images, error: imagesError }, { data: variants, error: variantsError }] =
      await Promise.all([
        supabase
          .from("product_images")
          .select("*")
          .eq("product_id", product.id)
          .order("sort_order", { ascending: true }),
        supabase
          .from("product_variants")
          .select("*")
          .eq("product_id", product.id)
          .order("sort_order", { ascending: true }),
      ]);

    if (imagesError) throw imagesError;
    if (variantsError) throw variantsError;

    return { product, images: images ?? [], variants: variants ?? [] };
  },
);
