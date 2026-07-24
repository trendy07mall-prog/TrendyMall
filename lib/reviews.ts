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

