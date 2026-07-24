"use server";

import { createClient } from "@/lib/supabase/server";

export interface SubmitReviewResult {
  ok?: boolean;
  error?: string;
}

export async function submitReview(
  productId: string,
  input: { rating: number; title: string; comment: string },
): Promise<SubmitReviewResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "You must be logged in to leave a review." };
  if (input.rating < 1 || input.rating > 5) return { error: "Pick a rating from 1 to 5." };

  const { data: orders } = await supabase
    .from("orders")
    .select("order_items(product_id)")
    .eq("user_id", user.id);

  const verifiedPurchase = (orders ?? []).some((order) =>
    (order.order_items ?? []).some((item) => item.product_id === productId),
  );

  const { error } = await supabase.from("reviews").insert({
    product_id: productId,
    user_id: user.id,
    rating: input.rating,
    title: input.title.trim() || null,
    comment: input.comment.trim() || null,
    verified_purchase: verifiedPurchase,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "You've already reviewed this product." };
    }
    return { error: "Could not submit your review. Please try again." };
  }

  return { ok: true };
}
