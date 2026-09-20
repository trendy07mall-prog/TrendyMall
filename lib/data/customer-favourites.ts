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

// THE one place that decides what "Top Rated" and "Best Sellers" mean.
//
// getCollectionProductIds is called by BOTH the homepage carousel (with a
// limit) and /shop?collection= (without one), so the shelf and the "View
// all" page it links to can never disagree about which products qualify.
// Nothing else in the app reimplements these rules.
//
// Products themselves come back through getProductsByIds -- the same
// pipeline /shop, /category and the campaign sections use -- so pricing,
// campaign badges, primary images and variant resolution are identical to
// every other grid, and there is no second product-shaping path.

export interface CustomerRating {
  avgRating: number;
  reviewCount: number;
}

export interface ReviewSnippet {
  comment: string;
  reviewerFirstName: string | null;
}

export interface FavouriteProduct extends ProductWithPrimaryImage {
  // Customer-only rating, from product_customer_rating_summary. This
  // deliberately SHADOWS the avgRating/reviewCount getProductsByIds
  // attaches: those come from product_rating_summary, which counts
  // admin-authored reviews too.
  avgRating: number;
  reviewCount: number;
  // The quote under the rating row, or null when no approved customer
  // review with text and 4+ stars exists (sql/080 applies those rules).
  review: ReviewSnippet | null;
}

export interface CustomerFavourites {
  mode: FavouritesMode;
  products: FavouriteProduct[];
}

async function getCustomerRatings(productIds: string[]): Promise<Map<string, CustomerRating>> {
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

async function getReviewSnippets(productIds: string[]): Promise<Map<string, ReviewSnippet>> {
  if (productIds.length === 0) return new Map();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_customer_review_snippets")
    .select("product_id, comment, reviewer_first_name")
    .in("product_id", productIds);

  if (error) throw error;
  return new Map(
    (data ?? []).map((row) => [
      row.product_id as string,
      { comment: row.comment as string, reviewerFirstName: row.reviewer_first_name as string | null },
    ]),
  );
}

// --- the shared rules --------------------------------------------------

// MODE A membership. `limit` omitted = every qualifying product, which is
// what /shop?collection=top-rated needs; the carousel passes SECTION_LIMIT.
async function getTopRatedIds(
  limit?: number,
): Promise<{ ids: string[]; ratings: Map<string, CustomerRating> }> {
  const supabase = await createClient();
  // The rating bar is applied in the database so a large catalogue doesn't
  // pull every rating row back to filter in memory.
  const { data: ratingRows, error } = await supabase
    .from("product_customer_rating_summary")
    .select("product_id, avg_rating, review_count")
    .gte("avg_rating", TOP_RATED_MIN_RATING)
    .gte("review_count", TOP_RATED_MIN_REVIEWS);

  if (error) throw error;
  const candidateIds = (ratingRows ?? []).map((r) => r.product_id as string);
  if (candidateIds.length === 0) return { ids: [], ratings: new Map() };

  const { data: liveRows, error: liveError } = await supabase
    .from("products")
    .select("id, created_at")
    .in("id", candidateIds)
    .eq("status", "published")
    .eq("is_deleted", false)
    .gt("stock", 0);

  if (liveError) throw liveError;

  const ratings = new Map<string, CustomerRating>(
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
  ).filter(qualifiesAsTopRated);

  return { ids: (limit == null ? ranked : ranked.slice(0, limit)).map((r) => r.id), ratings };
}

// MODE B membership, via the security-definer function in sql/079 (orders
// are not readable by a storefront visitor). Falls back to newest products
// when there is no order history yet.
async function getBestSellerIds(limit?: number): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_recent_top_sellers", {
    p_days: BEST_SELLER_WINDOW_DAYS,
    // The RPC needs a bound; without a caller limit ask for far more than
    // any realistic best-seller list, rather than leaving it unbounded.
    p_limit: limit ?? 1000,
  });

  if (error) throw error;
  const ids = (data ?? []).map((row: { product_id: string }) => row.product_id);
  if (ids.length >= SECTION_MIN_PRODUCTS) return ids;

  // No meaningful sales yet -- show the newest live stock instead of an
  // empty shelf. Deliberately not merged with the partial sales list:
  // mixing "sold 4" with "just arrived" would make the ordering meaningless.
  let newestQuery = supabase
    .from("products")
    .select("id")
    .eq("status", "published")
    .eq("is_deleted", false)
    .gt("stock", 0)
    .order("created_at", { ascending: false });
  if (limit != null) newestQuery = newestQuery.limit(limit);

  const { data: newest, error: newestError } = await newestQuery;
  if (newestError) throw newestError;
  return (newest ?? []).map((row) => row.id);
}

/**
 * Product ids for one collection, in its ranked order. THE shared entry
 * point: the homepage carousel and /shop?collection= both call this, so a
 * product can never appear on the shelf but be missing from "View all".
 * Omit `limit` for every qualifying product.
 */
export async function getCollectionProductIds(
  mode: FavouritesMode,
  limit?: number,
): Promise<string[]> {
  if (mode === "top_rated") return (await getTopRatedIds(limit)).ids;
  return getBestSellerIds(limit);
}

// --- card shaping ------------------------------------------------------

async function buildFavourites(
  orderedIds: string[],
  ratings: Map<string, CustomerRating>,
): Promise<FavouriteProduct[]> {
  if (orderedIds.length === 0) return [];
  const [products, snippets] = await Promise.all([
    getProductsByIds(orderedIds),
    getReviewSnippets(orderedIds),
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
        review: snippets.get(id) ?? null,
      } satisfies FavouriteProduct;
    })
    .filter((p): p is FavouriteProduct => p != null)
    .filter((p) => p.stock > 0);
}

/**
 * The homepage carousel's data, mode included. Returns null when neither
 * mode can fill a credible carousel, and the section then renders nothing
 * at all rather than a half-empty row.
 */
export async function getCustomerFavourites(): Promise<CustomerFavourites | null> {
  const { ids: topRatedIds, ratings: topRatedRatings } = await getTopRatedIds(SECTION_LIMIT);
  const mode = pickFavouritesMode(topRatedIds.length);

  if (mode === "top_rated") {
    const products = await buildFavourites(topRatedIds, topRatedRatings);
    if (products.length >= SECTION_MIN_PRODUCTS) return { mode, products };
    // The rating rows said there were enough, but shaping them dropped
    // some (unpublished between the two reads, say) -- fall through rather
    // than render a thin Top Rated row.
  }

  const bestSellerIds = await getBestSellerIds(SECTION_LIMIT);
  const ratings = await getCustomerRatings(bestSellerIds);
  const products = await buildFavourites(bestSellerIds, ratings);
  if (products.length < SECTION_MIN_PRODUCTS) return null;
  return { mode: "best_sellers", products };
}
