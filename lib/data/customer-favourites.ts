import { createClient } from "@/lib/supabase/server";
import { getProductsByIds } from "@/lib/data/products";
import {
  BEST_SELLER_WINDOW_DAYS,
  SECTION_LIMIT,
  SECTION_MIN_PRODUCTS,
  TOP_RATED_MIN_RATING,
  TOP_RATED_MIN_REVIEWS,
  pickFavouritesMode,
  qualifiesAsTopRated,
  sortTopRated,
} from "@/lib/customer-favourites";
import type { FavouritesMode } from "@/lib/customer-favourites";
import type { ProductWithPrimaryImage } from "@/types";

// The homepage "Customer Favourites" carousel's data. Products come back
// through getProductsByIds -- the same pipeline /shop, /category and the
// campaign sections use -- so pricing, campaign badges, primary images and
// variant resolution are identical to every other grid on the site and
// there is no second product-shaping path to keep in sync.

export interface FavouriteProduct extends ProductWithPrimaryImage {
  // Customer-only rating, from product_customer_rating_summary. This
  // deliberately SHADOWS the avgRating/reviewCount that
  // getProductsByIds attaches: those come from product_rating_summary,
  // which counts admin-authored reviews too. Nothing else on the site
  // needs that distinction today, so the override is applied here rather
  // than changing the shared product shape.
  avgRating: number;
  reviewCount: number;
  // How many active variants the product has. Drives the card's Add to
  // Cart rule: exactly one variant can be added straight from the card,
  // more than one has to be chosen on the product page.
  variantCount: number;
}

export interface CustomerFavourites {
  mode: FavouritesMode;
  products: FavouriteProduct[];
}

// Customer-only ratings for a set of products, keyed by product id. Reads
// the view added in sql/079, which excludes reviews written from admin
// accounts; see that migration for why this can't be an app-side join.
async function getCustomerRatings(
  productIds: string[],
): Promise<Map<string, { avgRating: number; reviewCount: number }>> {
  if (productIds.length === 0) return new Map();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_customer_rating_summary")
    .select("product_id, avg_rating, review_count")
    .in("product_id", productIds);

  if (error) throw error;
  return new Map(
    (data ?? []).map((row) => [
      row.product_id as string,
      { avgRating: Number(row.avg_rating ?? 0), reviewCount: Number(row.review_count ?? 0) },
    ]),
  );
}

// Active variants per product, in one batched query rather than one per
// card.
async function getVariantCounts(productIds: string[]): Promise<Map<string, number>> {
  if (productIds.length === 0) return new Map();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_variants")
    .select("product_id")
    .in("product_id", productIds)
    .eq("is_active", true);

  if (error) throw error;
  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    counts.set(row.product_id, (counts.get(row.product_id) ?? 0) + 1);
  }
  return counts;
}

// Shapes a set of product ids into cards, in the order given, dropping any
// product that is no longer live. Ratings and variant counts are attached
// here so both modes produce exactly the same card shape.
async function buildFavourites(
  orderedIds: string[],
  ratings: Map<string, { avgRating: number; reviewCount: number }>,
): Promise<FavouriteProduct[]> {
  if (orderedIds.length === 0) return [];
  const [products, variantCounts] = await Promise.all([
    getProductsByIds(orderedIds),
    getVariantCounts(orderedIds),
  ]);
  const byId = new Map(products.map((p) => [p.id, p]));

  return orderedIds
    .map((id) => {
      const product = byId.get(id);
      if (!product) return null;
      const rating = ratings.get(id);
      return {
        ...product,
        avgRating: rating?.avgRating ?? 0,
        reviewCount: rating?.reviewCount ?? 0,
        variantCount: variantCounts.get(id) ?? 0,
      } satisfies FavouriteProduct;
    })
    .filter((p): p is FavouriteProduct => p != null)
    .filter((p) => p.stock > 0);
}

// MODE A. Every in-stock published product whose CUSTOMER reviews clear
// both thresholds, best-rated first.
async function getTopRatedIds(): Promise<{
  ids: string[];
  ratings: Map<string, { avgRating: number; reviewCount: number }>;
}> {
  const supabase = await createClient();
  // The rating bar is applied in the database so a store with thousands of
  // products doesn't pull every rating row back to filter in memory.
  const { data: ratingRows, error } = await supabase
    .from("product_customer_rating_summary")
    .select("product_id, avg_rating, review_count")
    .gte("avg_rating", TOP_RATED_MIN_RATING)
    .gte("review_count", TOP_RATED_MIN_REVIEWS);

  if (error) throw error;
  const candidateIds = (ratingRows ?? []).map((r) => r.product_id as string);
  if (candidateIds.length === 0) return { ids: [], ratings: new Map() };

  // Only genuinely live, in-stock products can qualify. created_at comes
  // back here so the sort's newest-product tie-break doesn't need a second
  // read.
  const { data: liveRows, error: liveError } = await supabase
    .from("products")
    .select("id, created_at")
    .in("id", candidateIds)
    .eq("status", "published")
    .eq("is_deleted", false)
    .gt("stock", 0);

  if (liveError) throw liveError;

  const ratings = new Map(
    (ratingRows ?? []).map((r) => [
      r.product_id as string,
      { avgRating: Number(r.avg_rating ?? 0), reviewCount: Number(r.review_count ?? 0) },
    ]),
  );

  const ranked = sortTopRated(
    (liveRows ?? []).map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      ...(ratings.get(row.id) ?? { avgRating: 0, reviewCount: 0 }),
    })),
  )
    // Belt and braces: the thresholds are already applied above, but this
    // keeps the qualification rule in one place (lib/customer-favourites)
    // rather than only in a query.
    .filter(qualifiesAsTopRated)
    .slice(0, SECTION_LIMIT);

  return { ids: ranked.map((r) => r.id), ratings };
}

// MODE B. Units sold in delivered orders over the configured window, via
// the security-definer function in sql/079 (orders are not readable by a
// storefront visitor). Falls back to newest products when there is no
// order history yet.
async function getBestSellerIds(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_recent_top_sellers", {
    p_days: BEST_SELLER_WINDOW_DAYS,
    p_limit: SECTION_LIMIT,
  });

  if (error) throw error;
  const ids = (data ?? []).map((row: { product_id: string }) => row.product_id);
  if (ids.length >= SECTION_MIN_PRODUCTS) return ids;

  // No meaningful sales yet -- show the newest live stock instead of an
  // empty section. Deliberately not merged with the partial sales list:
  // mixing "sold 4" with "just arrived" would make the ordering meaningless.
  const { data: newest, error: newestError } = await supabase
    .from("products")
    .select("id")
    .eq("status", "published")
    .eq("is_deleted", false)
    .gt("stock", 0)
    .order("created_at", { ascending: false })
    .limit(SECTION_LIMIT);

  if (newestError) throw newestError;
  return (newest ?? []).map((row) => row.id);
}

/**
 * The whole section's data, mode included. Returns null when neither mode
 * can fill a credible carousel, and the section then renders nothing at
 * all rather than a half-empty row.
 */
export async function getCustomerFavourites(): Promise<CustomerFavourites | null> {
  const { ids: topRatedIds, ratings: topRatedRatings } = await getTopRatedIds();
  const mode = pickFavouritesMode(topRatedIds.length);

  if (mode === "top_rated") {
    const products = await buildFavourites(topRatedIds, topRatedRatings);
    if (products.length >= SECTION_MIN_PRODUCTS) return { mode, products };
    // The rating rows said there were enough, but shaping them dropped
    // some (unpublished between the two reads, say). Rather than render a
    // thin Top Rated row, fall through to Best Sellers.
  }

  const bestSellerIds = await getBestSellerIds();
  const ratings = await getCustomerRatings(bestSellerIds);
  const products = await buildFavourites(bestSellerIds, ratings);
  if (products.length < SECTION_MIN_PRODUCTS) return null;
  return { mode: "best_sellers", products };
}
