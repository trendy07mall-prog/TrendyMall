"use server";

import { createClient } from "@/lib/supabase/server";
import { sendNewReviewNotification } from "@/lib/email";
import { getNotificationSettings } from "@/lib/data/settings";

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

  // Best-effort, never blocks the review itself -- see lib/email.ts for
  // why every notification send follows this shape.
  try {
    const notifications = await getNotificationSettings();
    if (notifications.newReviewEnabled) {
      const { data: product } = await supabase.from("products").select("name").eq("id", productId).maybeSingle();
      await sendNewReviewNotification({
        productName: product?.name ?? "a product",
        reviewerEmail: user.email ?? "a customer",
        rating: input.rating,
        title: input.title.trim() || null,
        comment: input.comment.trim() || null,
      });
    }
  } catch (notifyError) {
    console.error("submitReview: owner notification failed (review itself already saved)", notifyError);
  }

  return { ok: true };
}
