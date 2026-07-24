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
  const { data: images, error } = await supabase
    .from("product_images")
    .select("product_id, image_url, sort_order")
    .in("product_id", ids)
    .order("sort_order", { ascending: true });

  if (error) throw error;

  const primaryByProductId = new Map<string, string>();
  for (const image of images ?? []) {
    if (!primaryByProductId.has(image.product_id)) {
      primaryByProductId.set(image.product_id, image.image_url);
    }
  }

  return products.map((product) => ({
    ...product,
    image: primaryByProductId.get(product.id) ?? null,
  }));
}

export async function getProductsByCategory(
  categoryId: string,
): Promise<ProductWithPrimaryImage[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("category_id", categoryId)
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return attachPrimaryImages(supabase, data);
}

export async function getAllProducts(): Promise<ProductWithPrimaryImage[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return attachPrimaryImages(supabase, data);
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
    .or(`name.ilike.%${safe}%,description.ilike.%${safe}%`)
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
