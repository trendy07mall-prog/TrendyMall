import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
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

export interface ProductListFilters {
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  sort?: "newest" | "price_asc" | "price_desc";
}

// Filters/sorts operate on actual_price (the listed price), not the
// discounted special_price — filtering/sorting by whichever is lower would
// need a computed expression on every query, so this matches the simpler
// convention most storefronts use. Supabase's query builder type changes
// shape on every chained call, so this shared helper widens to `any` to
// keep chaining across both call sites.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyProductListFilters(query: any, filters?: ProductListFilters): any {
  let q = query;
  if (filters?.brand) q = q.eq("brand", filters.brand);
  if (filters?.minPrice != null) q = q.gte("actual_price", filters.minPrice);
  if (filters?.maxPrice != null) q = q.lte("actual_price", filters.maxPrice);
  if (filters?.inStockOnly) q = q.gt("stock", 0);

  switch (filters?.sort) {
    case "price_asc":
      q = q.order("actual_price", { ascending: true });
      break;
    case "price_desc":
      q = q.order("actual_price", { ascending: false });
      break;
    default:
      q = q.order("created_at", { ascending: false });
  }
  return q;
}

export async function getProductsByCategory(
  categoryId: string,
  filters?: ProductListFilters,
): Promise<ProductWithPrimaryImage[]> {
  const supabase = await createClient();
  const { data, error } = await applyProductListFilters(
    supabase
      .from("products")
      .select("*")
      .eq("category_id", categoryId)
      .eq("status", "published"),
    filters,
  );

  if (error) throw error;
  return attachPrimaryImages(supabase, data);
}

export async function getAllProducts(
  filters?: ProductListFilters,
): Promise<ProductWithPrimaryImage[]> {
  const supabase = await createClient();
  const { data, error } = await applyProductListFilters(
    supabase.from("products").select("*").eq("status", "published"),
    filters,
  );

  if (error) throw error;
  return attachPrimaryImages(supabase, data);
}

export interface ParsedProductFilters {
  filters: ProductListFilters;
  brand: string;
  minPrice: string;
  maxPrice: string;
  inStockOnly: boolean;
  sort: string;
}

// Shared by /shop and /category/[slug]: turns the raw searchParams object
// Next.js hands to a page component into both the typed query filters and
// the plain strings ProductFilterBar needs to show current selections.
export function parseProductSearchParams(
  sp: Record<string, string | string[] | undefined>,
): ParsedProductFilters {
  const brand = typeof sp.brand === "string" ? sp.brand : "";
  const minPrice = typeof sp.minPrice === "string" ? sp.minPrice : "";
  const maxPrice = typeof sp.maxPrice === "string" ? sp.maxPrice : "";
  const inStockOnly = sp.inStockOnly === "1";
  const sortRaw = typeof sp.sort === "string" ? sp.sort : "newest";
  const sort: NonNullable<ProductListFilters["sort"]> =
    sortRaw === "price_asc" || sortRaw === "price_desc" ? sortRaw : "newest";

  return {
    filters: {
      brand: brand || undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      inStockOnly: inStockOnly || undefined,
      sort,
    },
    brand,
    minPrice,
    maxPrice,
    inStockOnly,
    sort,
  };
}

export async function getDistinctBrands(categoryId?: string): Promise<string[]> {
  const supabase = await createClient();
  let query = supabase
    .from("products")
    .select("brand")
    .eq("status", "published")
    .not("brand", "is", null);

  if (categoryId) query = query.eq("category_id", categoryId);

  const { data, error } = await query;
  if (error) throw error;

  const brands = new Set<string>();
  for (const row of data) {
    if (row.brand) brands.add(row.brand);
  }
  return [...brands].sort((a, b) => a.localeCompare(b));
}

export async function getNewArrivals(limit = 8): Promise<ProductWithPrimaryImage[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return attachPrimaryImages(supabase, data);
}

export async function searchProducts(query: string): Promise<ProductWithPrimaryImage[]> {
  const supabase = await createClient();
  const safe = query.replace(/[%_,]/g, " ").trim();
  if (!safe) return [];

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("status", "published")
    .or(`name.ilike.%${safe}%,description.ilike.%${safe}%,brand.ilike.%${safe}%`)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return attachPrimaryImages(supabase, data);
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
    .eq("status", "published")
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
    .eq("status", "published")
    .maybeSingle();

  return product?.slug ?? null;
}

export async function getAllProductSlugs(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("slug")
    .eq("status", "published");

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
      .eq("status", "published")
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
