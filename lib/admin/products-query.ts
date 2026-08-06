import { createClient } from "@/lib/supabase/server";
import { resolveCardDisplay } from "@/lib/data/products";
import type { VariantPriceRow } from "@/lib/data/products";
import type { AdminProductFilterState, AdminSortOption } from "@/lib/admin/product-filters";
import type { Product } from "@/types";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// Price now lives only on product_variants -- resolved to a product-id
// list here (same "small store, aggregate in JS" approach as the
// storefront's resolvePriceFilterProductIds) rather than a plain
// .gte/.lte on `products`.
async function resolveAdminPriceFilterProductIds(
  supabase: SupabaseServerClient,
  filters: AdminProductFilterState,
): Promise<string[] | undefined> {
  if (!filters.minPrice && !filters.maxPrice) return undefined;
  const min = filters.minPrice ? Number(filters.minPrice) : null;
  const max = filters.maxPrice ? Number(filters.maxPrice) : null;

  const { data } = await supabase
    .from("product_variants")
    .select("product_id, regular_price, sale_price")
    .eq("is_active", true);

  const minPriceByProduct = new Map<string, number>();
  for (const v of data ?? []) {
    const effective = v.sale_price ?? v.regular_price;
    const prev = minPriceByProduct.get(v.product_id);
    if (prev == null || effective < prev) minPriceByProduct.set(v.product_id, effective);
  }

  const ids: string[] = [];
  for (const [productId, price] of minPriceByProduct) {
    if (min != null && price < min) continue;
    if (max != null && price > max) continue;
    ids.push(productId);
  }
  return ids;
}

// Same shape as lib/data/products.ts's applyDbFilters/applyPostFilters split
// for the same reason: best_selling can't be pushed to SQL (it lives in a
// separate view), so for an admin product list this size, sorting the
// already-fetched array in JS is simpler than splitting the logic. price_asc/
// price_desc join the same category now that price lives on variants, not a
// plain products column an .order() can reach.
function applyAdminFilters(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  filters: AdminProductFilterState,
  brandIds: string[],
  priceProductIds?: string[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  let q = query;
  if (filters.categoryIds.length > 0) q = q.in("category_id", filters.categoryIds);
  if (brandIds.length > 0) q = q.in("brand_id", brandIds);
  if (priceProductIds) q = q.in("id", priceProductIds);
  if (filters.featured) q = q.eq("is_featured", true);

  if (filters.stockStatus === "in_stock") q = q.gte("stock", 5);
  else if (filters.stockStatus === "low_stock") q = q.gt("stock", 0).lt("stock", 5);
  else if (filters.stockStatus === "out_of_stock") q = q.lte("stock", 0);

  return q;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyAdminSort(query: any, sort: AdminSortOption): any {
  switch (sort) {
    case "oldest":
      return query.order("created_at", { ascending: true });
    case "most_viewed":
      return query.order("view_count", { ascending: false });
    default:
      return query.order("created_at", { ascending: false });
  }
}

async function sortByBestSelling<T extends Product>(
  supabase: SupabaseServerClient,
  products: T[],
): Promise<T[]> {
  const ids = products.map((p) => p.id);
  if (ids.length === 0) return products;

  const { data: sales } = await supabase
    .from("product_sales_summary")
    .select("product_id, units_sold")
    .in("product_id", ids);

  const unitsSoldById = new Map<string, number>();
  for (const row of sales ?? []) unitsSoldById.set(row.product_id, row.units_sold);

  return [...products].sort(
    (a, b) => (unitsSoldById.get(b.id) ?? 0) - (unitsSoldById.get(a.id) ?? 0),
  );
}

// Mirrors getSearchMatchIds in lib/data/products.ts (direct field matches
// unioned with a category-name match) — admin doesn't need the storefront's
// tsvector ranking, just a working substring match across name/sku/brand.
async function getAdminSearchMatchIds(
  supabase: SupabaseServerClient,
  search: string,
): Promise<string[]> {
  const escaped = search.replace(/[%,]/g, "");
  const [{ data: directMatches }, { data: matchingCategories }] = await Promise.all([
    supabase
      .from("products")
      .select("id")
      .or(`name.ilike.%${escaped}%,sku.ilike.%${escaped}%,brand.ilike.%${escaped}%`),
    supabase.from("categories").select("id").ilike("name", `%${escaped}%`),
  ]);

  const ids = new Set((directMatches ?? []).map((p) => p.id));
  const categoryIds = (matchingCategories ?? []).map((c) => c.id);
  if (categoryIds.length > 0) {
    const { data: categoryMatches } = await supabase
      .from("products")
      .select("id")
      .in("category_id", categoryIds);
    for (const p of categoryMatches ?? []) ids.add(p.id);
  }
  return [...ids];
}

export interface AdminProductRow extends Product {
  image: string | null;
  actual_price: number;
  special_price: number | null;
  hasMultiplePrices: boolean;
  defaultVariantId: string;
}

// Mirrors lib/data/products.ts's attachPrimaryImages (image + computed
// display price off variants), minus the ratings join the admin table
// doesn't need.
async function attachPrimaryImages(
  supabase: SupabaseServerClient,
  products: Product[],
): Promise<AdminProductRow[]> {
  if (products.length === 0) return [];

  const ids = products.map((p) => p.id);
  const [{ data: images }, { data: variantRows }] = await Promise.all([
    supabase
      .from("product_images")
      .select("product_id, image_url, sort_order")
      .in("product_id", ids)
      .order("sort_order", { ascending: true }),
    supabase
      .from("product_variants")
      .select("id, product_id, regular_price, sale_price, stock, is_default, variant_image_url")
      .in("product_id", ids)
      .eq("is_active", true),
  ]);

  const primaryByProductId = new Map<string, string>();
  for (const image of images ?? []) {
    if (!primaryByProductId.has(image.product_id)) {
      primaryByProductId.set(image.product_id, image.image_url);
    }
  }

  const variantsByProductId = new Map<string, VariantPriceRow[]>();
  for (const v of (variantRows ?? []) as VariantPriceRow[]) {
    const list = variantsByProductId.get(v.product_id) ?? [];
    list.push(v);
    variantsByProductId.set(v.product_id, list);
  }

  return products.map((product) => {
    const variants = variantsByProductId.get(product.id) ?? [];
    const display =
      variants.length > 0
        ? resolveCardDisplay(variants)
        : { actualPrice: 0, specialPrice: null, hasMultiplePrices: false, variantId: "", image: null };
    return {
      ...product,
      image: primaryByProductId.get(product.id) ?? null,
      actual_price: display.actualPrice,
      special_price: display.specialPrice,
      hasMultiplePrices: display.hasMultiplePrices,
      defaultVariantId: display.variantId,
    };
  });
}

// Filtering by raw brand text would miss casing-drifted rows even though
// the dropdown itself now only ever offers canonical brand names -- same
// reasoning as the storefront's toProductListFilters brandIds resolution.
async function resolveBrandIds(
  supabase: SupabaseServerClient,
  names: string[],
): Promise<string[]> {
  if (names.length === 0) return [];
  const { data } = await supabase.from("brands").select("id, name").in("name", names);
  return (data ?? []).map((b) => b.id);
}

export const ADMIN_PRODUCTS_PAGE_SIZE = 20;

export interface AdminProductsPage {
  products: AdminProductRow[];
  totalCount: number;
}

// True server-side .range() pagination works for the 5 SQL-orderable
// sorts. best_selling can't join product_sales_summary into an .order()
// call, so — same reasoning as everywhere else in this codebase — it
// fetches the full filtered set, sorts in JS, then slices to the
// requested page in JS instead.
export async function getAdminProducts(
  filters: AdminProductFilterState,
  page = 1,
  pageSize: number = ADMIN_PRODUCTS_PAGE_SIZE,
): Promise<AdminProductsPage> {
  const supabase = await createClient();

  let matchIds: string[] | null = null;
  const search = filters.search.trim();
  if (search) {
    matchIds = await getAdminSearchMatchIds(supabase, search);
    if (matchIds.length === 0) return { products: [], totalCount: 0 };
  }
  const [brandIds, priceProductIds] = await Promise.all([
    resolveBrandIds(supabase, filters.brands),
    resolveAdminPriceFilterProductIds(supabase, filters),
  ]);

  function buildBaseQuery(forCount: boolean) {
    let query = forCount
      ? supabase.from("products").select("*", { count: "exact", head: true })
      : supabase.from("products").select("*");
    query =
      filters.status === "deleted"
        ? query.eq("is_deleted", true)
        : query.eq("is_deleted", false);
    if (filters.status === "draft" || filters.status === "published") {
      query = query.eq("status", filters.status);
    }
    query = applyAdminFilters(query, filters, brandIds, priceProductIds);
    if (matchIds) query = query.in("id", matchIds);
    return query;
  }

  // price_asc/price_desc join best_selling in the "fetch full filtered set,
  // sort in JS" lane now that price lives on variants (attachPrimaryImages'
  // variant join is what resolves it), not a plain products column an
  // .order() can reach.
  if (filters.sort === "best_selling" || filters.sort === "price_asc" || filters.sort === "price_desc") {
    const { data, error } = await buildBaseQuery(false);
    if (error) throw error;

    const withPrices = await attachPrimaryImages(supabase, data ?? []);
    const sorted =
      filters.sort === "best_selling"
        ? await sortByBestSelling(supabase, withPrices)
        : [...withPrices].sort((a, b) =>
            filters.sort === "price_asc"
              ? a.actual_price - b.actual_price
              : b.actual_price - a.actual_price,
          );

    const start = (page - 1) * pageSize;
    const pageSlice = sorted.slice(start, start + pageSize);
    return { products: pageSlice, totalCount: sorted.length };
  }

  const start = (page - 1) * pageSize;
  const [{ data, error }, { count, error: countError }] = await Promise.all([
    applyAdminSort(buildBaseQuery(false), filters.sort).range(start, start + pageSize - 1),
    buildBaseQuery(true),
  ]);
  if (error) throw error;
  if (countError) throw countError;

  return { products: await attachPrimaryImages(supabase, data ?? []), totalCount: count ?? 0 };
}

// For CSV export, which needs every matching row regardless of the
// current page — not exposed via getAdminProducts (which always paginates)
// to keep that function's contract simple for the table's use.
export async function getAllMatchingAdminProducts(
  filters: AdminProductFilterState,
): Promise<Product[]> {
  const supabase = await createClient();

  let matchIds: string[] | null = null;
  const search = filters.search.trim();
  if (search) {
    matchIds = await getAdminSearchMatchIds(supabase, search);
    if (matchIds.length === 0) return [];
  }

  const [brandIds, priceProductIds] = await Promise.all([
    resolveBrandIds(supabase, filters.brands),
    resolveAdminPriceFilterProductIds(supabase, filters),
  ]);

  let query = supabase.from("products").select("*");
  query =
    filters.status === "deleted"
      ? query.eq("is_deleted", true)
      : query.eq("is_deleted", false);
  if (filters.status === "draft" || filters.status === "published") {
    query = query.eq("status", filters.status);
  }
  query = applyAdminFilters(query, filters, brandIds, priceProductIds);
  if (matchIds) query = query.in("id", matchIds);
  // price_asc/price_desc row order in an exported CSV isn't user-facing the
  // way the browse page's sort is -- falls back to newest, same as
  // best_selling already did, rather than adding a second JS-sort path here.
  const sortable = filters.sort === "price_asc" || filters.sort === "price_desc" || filters.sort === "best_selling";
  query = applyAdminSort(query, sortable ? "newest" : filters.sort);

  const { data, error } = await query;
  if (error) throw error;

  return filters.sort === "best_selling" ? sortByBestSelling(supabase, data ?? []) : data ?? [];
}

export interface ProductSummaryCounts {
  total: number;
  active: number;
  featured: number;
  lowStock: number;
  outOfStock: number;
}

export async function getProductSummaryCounts(): Promise<ProductSummaryCounts> {
  const supabase = await createClient();
  const [
    { count: total },
    { count: active },
    { count: featured },
    { count: lowStock },
    { count: outOfStock },
  ] = await Promise.all([
    supabase.from("products").select("*", { count: "exact", head: true }).eq("is_deleted", false),
    supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("is_deleted", false)
      .eq("status", "published"),
    supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("is_deleted", false)
      .eq("is_featured", true),
    supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("is_deleted", false)
      .gt("stock", 0)
      .lt("stock", 5),
    supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("is_deleted", false)
      .lte("stock", 0),
  ]);

  return {
    total: total ?? 0,
    active: active ?? 0,
    featured: featured ?? 0,
    lowStock: lowStock ?? 0,
    outOfStock: outOfStock ?? 0,
  };
}

export async function getAdminProductsByIds(ids: string[]): Promise<Product[]> {
  if (ids.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from("products").select("*").in("id", ids);
  if (error) throw error;
  return data ?? [];
}

export async function getDistinctBrands(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("brands").select("name").order("name");
  return (data ?? []).map((b) => b.name);
}
