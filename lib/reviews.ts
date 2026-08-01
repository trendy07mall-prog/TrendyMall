import { createClient } from "@/lib/supabase/server";
import type { ProductRatingSummary, Review } from "@/types";

export interface ReviewWithReviewerName extends Review {
  reviewerName: string;
}

export async function getProductReviews(
  productId: string,
): Promise<ReviewWithReviewerName[]> {
  const supabase = await createClient();
  const { data: reviews, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("product_id", productId)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (error) throw error;
  if (!reviews || reviews.length === 0) return [];

  const userIds = [...new Set(reviews.map((r) => r.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", userIds);

  const nameByUserId = new Map(
    (profiles ?? []).map((p) => [p.id, p.full_name] as const),
  );

  return reviews.map((review) => ({
    ...review,
    reviewerName: nameByUserId.get(review.user_id) || "Verified Customer",
  }));
}

export async function getProductRatingSummary(
  productId: string,
): Promise<ProductRatingSummary | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("product_rating_summary")
    .select("*")
    .eq("product_id", productId)
    .maybeSingle();

  return data;
}

export interface FeaturedReview {
  id: string;
  rating: number;
  title: string | null;
  comment: string;
  createdAt: string;
  reviewerName: string;
  productName: string;
  productSlug: string;
}

// Site-wide (not scoped to one product), for the homepage's Customer
// Reviews section — only ever real, approved reviews (never fabricated
// placeholders). Highest-rated first, capped small since this is a
// homepage teaser, not a full reviews listing.
export async function getFeaturedReviews(limit = 6): Promise<FeaturedReview[]> {
  const supabase = await createClient();
  const { data: reviews, error } = await supabase
    .from("reviews")
    .select("id, rating, title, comment, created_at, user_id, product_id")
    .eq("status", "approved")
    .order("rating", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  if (!reviews || reviews.length === 0) return [];

  const userIds = [...new Set(reviews.map((r) => r.user_id))];
  const productIds = [...new Set(reviews.map((r) => r.product_id).filter((id): id is string => Boolean(id)))];

  const [{ data: profiles }, { data: products }] = await Promise.all([
    supabase.from("profiles").select("id, full_name").in("id", userIds),
    supabase.from("products").select("id, name, slug").in("id", productIds),
  ]);

  const nameByUserId = new Map((profiles ?? []).map((p) => [p.id, p.full_name] as const));
  const productById = new Map((products ?? []).map((p) => [p.id, p] as const));

  return reviews
    .map((review) => {
      const product = review.product_id ? productById.get(review.product_id) : undefined;
      if (!product) return null;
      return {
        id: review.id,
        rating: review.rating,
        title: review.title,
        comment: review.comment,
        createdAt: review.created_at,
        reviewerName: nameByUserId.get(review.user_id) || "Verified Customer",
        productName: product.name,
        productSlug: product.slug,
      };
    })
    .filter((r): r is FeaturedReview => r != null);
}

export async function hasUserReviewed(
  productId: string,
  userId: string,
): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reviews")
    .select("id")
    .eq("product_id", productId)
    .eq("user_id", userId)
    .maybeSingle();

  return data != null;
}

