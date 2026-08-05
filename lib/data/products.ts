import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { ProductListFilters } from "@/lib/product-filters";
import { newArrivalCutoff } from "@/lib/product-filters";
import { getProductIdsForTags } from "@/lib/data/tags";
import { getProductAttributesForDetail, getProductIdsForAttributeValues } from "@/lib/data/attributes";
import { buildCategoryTree, flattenCategoryTree } from "@/lib/category-tree";
import type {
  Attribute,
  AttributeValue,
  Product,
  ProductImage,
  ProductVariant,
  ProductWithPrimaryImage,
} from "@/types";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// Tags/attribute values live in join tables (product_tags/
// product_attribute_values), so they can't be filtered with a plain
// `.in(column, ids)` against `products` the way brand_id/category_id can --
// each is resolved to a concrete product-id list once per query, then fed
// into applyDbFilters as extra `.in("id", ...)` narrowing calls (chaining
// multiple `.in("id", ...)` on the same column composes as an intersection,
// so an active tag filter AND an active attribute filter correctly narrow
// together), the same mechanism /search's restrictToIds already uses.
async function resolveTagProductIds(filters: ProductListFilters): Promise<string[] | undefined> {
  if (!filters.tagIds?.length) return undefined;
  return getProductIdsForTags(filters.tagIds);
}

async function resolveAttributeValueProductIds(filters: ProductListFilters): Promise<string[] | undefined> {
  if (!filters.attributeValueIds?.length) return undefined;
  return getProductIdsForAttributeValues(filters.attributeValueIds);
}

async function attachPrimaryImages(
  supabase: SupabaseServerClient,
  products: Product[],
): Promise<ProductWithPrimaryImage[]> {
  if (products.length === 0) return [];

  const ids = products.map((p) => p.id);
  const [
    { data: images, error: imagesError },
    { data: ratings, error: ratingsError },
    { data: productTagRows, error: tagsError },
  ] = await Promise.all([
    supabase
      .from("product_images")
      .select("product_id, image_url, sort_order")
      .in("product_id", ids)
      .order("sort_order", { ascending: true }),
    supabase
      .from("product_rating_summary")
      .select("product_id, avg_rating, review_count")
      .in("product_id", ids),
    supabase
      .from("product_tags")
      .select("product_id, tags(name, slug, is_active)")
      .in("product_id", ids),
  ]);

  if (imagesError) throw imagesError;
  if (ratingsError) throw ratingsError;
  if (tagsError) throw tagsError;

  const primaryByProductId = new Map<string, string>();
  for (const image of images ?? []) {
    if (!primaryByProductId.has(image.product_id)) {
      primaryByProductId.set(image.product_id, image.image_url);
    }
  }

  const ratingByProductId = new Map(
    (ratings ?? []).map((r) => [r.product_id, r] as const),
  );

  const tagsByProductId = new Map<string, { name: string; slug: string }[]>();
  for (const row of productTagRows ?? []) {
    const tag = row.tags as unknown as { name: string; slug: string; is_active: boolean } | null;
    if (!tag?.is_active) continue;
    const list = tagsByProductId.get(row.product_id) ?? [];
    list.push({ name: tag.name, slug: tag.slug });
    tagsByProductId.set(row.product_id, list);
  }

  return products.map((product) => {
    const rating = ratingByProductId.get(product.id);
    return {
      ...product,
      image: primaryByProductId.get(product.id) ?? null,
      avgRating: rating?.avg_rating ?? 0,
      reviewCount: rating?.review_count ?? 0,
      tags: tagsByProductId.get(product.id) ?? [],
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
function applyDbFilters(query: any, filters: ProductListFilters, narrowingIdLists?: (string[] | undefined)[]): any {
  let q = query;
  if (filters.categoryIds?.length) q = q.in("category_id", filters.categoryIds);
  if (filters.brandIds?.length) q = q.in("brand_id", filters.brandIds);
  // Each join-table-backed filter (tags, attribute values, ...) contributes
  // its own pre-resolved product-id list here -- chaining multiple
  // `.in("id", ...)` calls on the same column composes as an intersection.
  for (const idList of narrowingIdLists ?? []) {
    if (idList) q = q.in("id", idList);
  }
  if (filters.minPrice != null) q = q.gte("actual_price", filters.minPrice);
  if (filters.maxPrice != null) q = q.lte("actual_price", filters.maxPrice);
  if (filters.cod) q = q.eq("cod_available", true);
  if (filters.freeDelivery) q = q.eq("free_delivery", true);
  if (filters.warranty) q = q.eq("warranty_available", true);

  if (filters.inStock && !filters.outOfStock) q = q.gt("stock", 0);
  else if (filters.outOfStock && !filters.inStock) q = q.lte("stock", 0);

  const promoConditions: string[] = [];
  if (filters.onSale) promoConditions.push("special_price.not.is.null");
  if (filters.newArrival) promoConditions.push(`created_at.gte.${newArrivalCutoff()}`);
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

// categoryIds is the target category's own id plus every descendant's id
// (see getDescendantCategoryIds) -- a single-item array behaves exactly
// like the old .eq("category_id", categoryId) for a leaf category with no
// children.
export async function getProductsByCategory(
  categoryIds: string[],
  filters: ProductListFilters = { sort: "newest" },
): Promise<ProductWithPrimaryImage[]> {
  const supabase = await createClient();
  const [tagProductIds, attributeProductIds] = await Promise.all([
    resolveTagProductIds(filters),
    resolveAttributeValueProductIds(filters),
  ]);
  const { data, error } = await applyDbFilters(
    supabase
      .from("products")
      .select("*")
      .in("category_id", categoryIds)
      .eq("status", "published").eq("is_deleted", false),
    filters,
    [tagProductIds, attributeProductIds],
  );

  if (error) throw error;
  const withImages = await attachPrimaryImages(supabase, data);
  return applyPostFilters(supabase, withImages, filters);
}

export async function getAllProducts(
  filters: ProductListFilters = { sort: "newest" },
): Promise<ProductWithPrimaryImage[]> {
  const supabase = await createClient();
  const [tagProductIds, attributeProductIds] = await Promise.all([
    resolveTagProductIds(filters),
    resolveAttributeValueProductIds(filters),
  ]);
  const { data, error } = await applyDbFilters(
    supabase.from("products").select("*").eq("status", "published").eq("is_deleted", false),
    filters,
    [tagProductIds, attributeProductIds],
  );

  if (error) throw error;
  const withImages = await attachPrimaryImages(supabase, data);
  return applyPostFilters(supabase, withImages, filters);
}

export interface FacetCounts {
  categories: { slug: string; name: string; count: number; depth: number }[];
  brands: { name: string; count: number }[];
  tags: { name: string; slug: string; count: number }[];
  attributes: { attributeName: string; attributeSlug: string; values: { name: string; slug: string; count: number }[] }[];
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
  options: { categoryIds?: string[]; includeCategoryFacet?: boolean; restrictToIds?: string[] } = {},
): Promise<FacetCounts> {
  if (options.restrictToIds && options.restrictToIds.length === 0) {
    return { categories: [], brands: [], tags: [], attributes: [] };
  }

  const supabase = await createClient();
  const filtersWithoutCategory: ProductListFilters = { ...filters, categoryIds: undefined };
  const filtersWithoutBrand: ProductListFilters = { ...filters, brands: undefined, brandIds: undefined };
  const filtersWithoutTag: ProductListFilters = { ...filters, tagIds: undefined };
  const filtersWithoutAttribute: ProductListFilters = { ...filters, attributeValueIds: undefined };
  const [tagProductIds, attributeProductIds] = await Promise.all([
    resolveTagProductIds(filters),
    resolveAttributeValueProductIds(filters),
  ]);

  let categories: FacetCounts["categories"] = [];
  if (options.includeCategoryFacet !== false) {
    let categoryCountQuery = supabase.from("products").select("category_id").eq("status", "published").eq("is_deleted", false);
    if (options.restrictToIds) categoryCountQuery = categoryCountQuery.in("id", options.restrictToIds);

    const [{ data: categoryRows }, { data: productRows }] = await Promise.all([
      supabase.from("categories").select("*").eq("is_active", true),
      applyDbFilters(categoryCountQuery, filtersWithoutCategory, [tagProductIds, attributeProductIds]),
    ]);

    const countByCategoryId = new Map<string, number>();
    for (const row of productRows ?? []) {
      countByCategoryId.set(row.category_id, (countByCategoryId.get(row.category_id) ?? 0) + 1);
    }
    // Depth-first tree order (not a flat sort_order sort) so parent/child
    // categories group together in the filter sidebar instead of being
    // interleaved by their raw sort_order values.
    const orderedCategories = flattenCategoryTree(buildCategoryTree(categoryRows ?? []));
    categories = orderedCategories.map((c) => ({
      slug: c.slug,
      name: c.name,
      depth: c.depth,
      count: countByCategoryId.get(c.id) ?? 0,
    }));
  }

  let brandQuery = supabase
    .from("products")
    .select("brand_id")
    .eq("status", "published").eq("is_deleted", false)
    .not("brand_id", "is", null);
  if (options.categoryIds) brandQuery = brandQuery.in("category_id", options.categoryIds);
  if (options.restrictToIds) brandQuery = brandQuery.in("id", options.restrictToIds);
  const [{ data: brandRows }, { data: brandCatalog }] = await Promise.all([
    applyDbFilters(brandQuery, filtersWithoutBrand, [tagProductIds, attributeProductIds]),
    supabase.from("brands").select("id, name").eq("is_active", true),
  ]);

  const countByBrandId = new Map<string, number>();
  for (const row of brandRows ?? []) {
    if (row.brand_id) countByBrandId.set(row.brand_id, (countByBrandId.get(row.brand_id) ?? 0) + 1);
  }
  const brands = (brandCatalog ?? [])
    .map((b) => ({ name: b.name, count: countByBrandId.get(b.id) ?? 0 }))
    .filter((b) => b.count > 0)
    .sort((a, b) => a.name.localeCompare(b.name));

  // Tags live in a join table, so the facet needs an extra hop: first the
  // set of products eligible under every OTHER active filter (including an
  // active attribute filter, but deliberately NOT tagProductIds -- that's
  // this facet's own selection), then which tags those products carry.
  let tagCountQuery = supabase.from("products").select("id").eq("status", "published").eq("is_deleted", false);
  if (options.categoryIds) tagCountQuery = tagCountQuery.in("category_id", options.categoryIds);
  if (options.restrictToIds) tagCountQuery = tagCountQuery.in("id", options.restrictToIds);
  const { data: tagEligibleProducts } = await applyDbFilters(tagCountQuery, filtersWithoutTag, [attributeProductIds]);
  const tagEligibleProductIds = (tagEligibleProducts ?? []).map((p: { id: string }) => p.id);

  let tags: FacetCounts["tags"] = [];
  if (tagEligibleProductIds.length > 0) {
    const [{ data: productTagRows }, { data: tagCatalog }] = await Promise.all([
      supabase.from("product_tags").select("tag_id").in("product_id", tagEligibleProductIds),
      supabase.from("tags").select("id, name, slug").eq("is_active", true),
    ]);

    const countByTagId = new Map<string, number>();
    for (const row of productTagRows ?? []) {
      countByTagId.set(row.tag_id, (countByTagId.get(row.tag_id) ?? 0) + 1);
    }
    tags = (tagCatalog ?? [])
      .map((t) => ({ name: t.name, slug: t.slug, count: countByTagId.get(t.id) ?? 0 }))
      .filter((t) => t.count > 0)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  // Attributes: same two-hop join-table pattern as tags, with an extra
  // grouping level (values grouped under their parent attribute for the
  // storefront's one-FilterGroup-per-attribute rendering).
  let attributeCountQuery = supabase.from("products").select("id").eq("status", "published").eq("is_deleted", false);
  if (options.categoryIds) attributeCountQuery = attributeCountQuery.in("category_id", options.categoryIds);
  if (options.restrictToIds) attributeCountQuery = attributeCountQuery.in("id", options.restrictToIds);
  const { data: attributeEligibleProducts } = await applyDbFilters(attributeCountQuery, filtersWithoutAttribute, [
    tagProductIds,
  ]);
  const attributeEligibleProductIds = (attributeEligibleProducts ?? []).map((p: { id: string }) => p.id);

  let attributes: FacetCounts["attributes"] = [];
  if (attributeEligibleProductIds.length > 0) {
    const [{ data: productAttributeRows }, { data: attributeCatalog }, { data: valueCatalog }] = await Promise.all([
      supabase.from("product_attribute_values").select("attribute_value_id").in("product_id", attributeEligibleProductIds),
      supabase.from("attributes").select("id, name, slug").order("sort_order"),
      supabase.from("attribute_values").select("id, attribute_id, value, slug").order("sort_order"),
    ]);

    const countByValueId = new Map<string, number>();
    for (const row of productAttributeRows ?? []) {
      countByValueId.set(row.attribute_value_id, (countByValueId.get(row.attribute_value_id) ?? 0) + 1);
    }

    attributes = (attributeCatalog ?? [])
      .map((attribute) => ({
        attributeName: attribute.name,
        attributeSlug: attribute.slug,
        values: (valueCatalog ?? [])
          .filter((v) => v.attribute_id === attribute.id)
          .map((v) => ({ name: v.value, slug: v.slug, count: countByValueId.get(v.id) ?? 0 }))
          .filter((v) => v.count > 0),
      }))
      .filter((a) => a.values.length > 0);
  }

  return { categories, brands, tags, attributes };
}

export async function getPublishedProductCount(categoryIds?: string[]): Promise<number> {
  const supabase = await createClient();
  let query = supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("status", "published").eq("is_deleted", false);
  if (categoryIds) query = query.in("category_id", categoryIds);

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

// Now uses the same NEW_ARRIVAL_WINDOW_DAYS cutoff as the /shop filter's
// "New Arrival" checkbox (see applyDbFilters) -- previously this ignored
// age entirely and just showed the newest N published products, so a
// stale catalog could show a 2-year-old product here while it failed its
// own definition on the filter checkbox. A thin catalog may now return
// fewer than `limit` results, which is correct: it means fewer than that
// many products actually qualify as new.
export async function getNewArrivals(limit = 8): Promise<ProductWithPrimaryImage[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("status", "published").eq("is_deleted", false)
    .gte("created_at", newArrivalCutoff())
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return attachPrimaryImages(supabase, data);
}

// Real ceiling for the homepage's "Up to X% Off" promotion — never a
// hardcoded figure. Rounded DOWN to the nearest 5 so the card never claims
// more than what's actually live (round-to-nearest could round a true 24%
// up to 25%). Returns null when nothing currently qualifies, so the caller
// can skip rendering the promotion entirely rather than showing "Up to 0%".
export async function getMaxDiscountPercent(): Promise<number | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("actual_price, special_price")
    .eq("status", "published")
    .eq("is_deleted", false)
    .not("special_price", "is", null);

  if (error) throw error;

  let max = 0;
  for (const { actual_price, special_price } of data) {
    if (special_price == null || special_price >= actual_price || actual_price <= 0) continue;
    const percent = ((actual_price - special_price) / actual_price) * 100;
    if (percent > max) max = percent;
  }

  const rounded = Math.floor(max / 5) * 5;
  return rounded > 0 ? rounded : null;
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
  const [tagProductIds, attributeProductIds] = await Promise.all([
    resolveTagProductIds(filters),
    resolveAttributeValueProductIds(filters),
  ]);

  const { data, error } = await applyDbFilters(
    supabase.from("products").select("*").eq("status", "published").eq("is_deleted", false).in("id", matchIds),
    filters,
    [tagProductIds, attributeProductIds],
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

// A color variant enriched with its own image set (up to 4, product_variant_images
// ordered by sort_order) -- falls back to the legacy single variant_image_url
// when a variant hasn't been re-saved since the multi-image migration.
export type ProductVariantWithImages = ProductVariant & { images: string[] };

export interface ProductDetail {
  product: Product;
  images: ProductImage[];
  variants: ProductVariantWithImages[];
  attributes: { attribute: Attribute; values: AttributeValue[] }[];
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

    const [
      { data: images, error: imagesError },
      { data: variants, error: variantsError },
      attributes,
    ] = await Promise.all([
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
      getProductAttributesForDetail(product.id),
    ]);

    if (imagesError) throw imagesError;
    if (variantsError) throw variantsError;

    const variantIds = (variants ?? []).map((v) => v.id);
    const { data: variantImages, error: variantImagesError } =
      variantIds.length > 0
        ? await supabase
            .from("product_variant_images")
            .select("variant_id, image_url, sort_order")
            .in("variant_id", variantIds)
            .order("sort_order", { ascending: true })
        : { data: [] as { variant_id: string; image_url: string; sort_order: number }[], error: null };
    if (variantImagesError) throw variantImagesError;

    const imagesByVariantId = new Map<string, string[]>();
    for (const row of variantImages ?? []) {
      const list = imagesByVariantId.get(row.variant_id) ?? [];
      list.push(row.image_url);
      imagesByVariantId.set(row.variant_id, list);
    }

    const variantsWithImages: ProductVariantWithImages[] = (variants ?? []).map((v) => ({
      ...v,
      images: imagesByVariantId.get(v.id) ?? (v.variant_image_url ? [v.variant_image_url] : []),
    }));

    return { product, images: images ?? [], variants: variantsWithImages, attributes };
  },
);
