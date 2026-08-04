"use server";

import { createClient } from "@/lib/supabase/server";
import type { ProductWithPrimaryImage } from "@/types";

// A "use server" file, not a plain data-fetcher in lib/data/products.ts —
// the cart page that calls this is a client component, and that file's
// server-only helpers can't be imported into client code (same constraint
// lib/cart-validation.ts and lib/cart-sync.ts already work around).
export async function getCartRecommendations(
  productIds: string[],
  limit = 8,
): Promise<ProductWithPrimaryImage[]> {
  if (productIds.length === 0) return [];

  const supabase = await createClient();

  const { data: cartProducts, error: cartProductsError } = await supabase
    .from("products")
    .select("category_id")
    .in("id", productIds);
  if (cartProductsError) throw cartProductsError;

  const categoryIds = Array.from(new Set((cartProducts ?? []).map((p) => p.category_id)));
  if (categoryIds.length === 0) return [];

  // Excluding cart products in JS (rather than a raw "not in" filter string)
  // avoids building a PostgREST filter expression out of client-supplied
  // ids; fetching a small buffer above `limit` keeps the post-filter slice
  // full even when several fetched candidates turn out to already be in
  // the cart.
  const cartIdSet = new Set(productIds);
  const { data: candidatesRaw, error: candidatesError } = await supabase
    .from("products")
    .select("*")
    .in("category_id", categoryIds)
    .eq("status", "published")
    .eq("is_deleted", false)
    .gt("stock", 0)
    .order("created_at", { ascending: false })
    .limit(limit + productIds.length);
  if (candidatesError) throw candidatesError;

  const candidates = (candidatesRaw ?? [])
    .filter((p) => !cartIdSet.has(p.id))
    .slice(0, limit);
  if (candidates.length === 0) return [];

  const ids = candidates.map((p) => p.id);
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

  const primaryImageByProductId = new Map<string, string>();
  for (const image of images ?? []) {
    if (!primaryImageByProductId.has(image.product_id)) {
      primaryImageByProductId.set(image.product_id, image.image_url);
    }
  }
  const ratingByProductId = new Map((ratings ?? []).map((r) => [r.product_id, r] as const));

  return candidates.map((product) => {
    const rating = ratingByProductId.get(product.id);
    return {
      ...product,
      image: primaryImageByProductId.get(product.id) ?? null,
      avgRating: rating?.avg_rating ?? 0,
      reviewCount: rating?.review_count ?? 0,
      // Not fetched here -- this recommendations widget doesn't need tag
      // badges the way primary product-browsing surfaces do.
      tags: [],
    };
  });
}
