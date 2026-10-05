"use server";

import { revalidatePath, updateTag } from "next/cache";
import { requireAdminClient } from "@/lib/admin/guard";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { validateReply } from "@/lib/review-reply";

export type ReplyResult = { error: string } | { success: true } | undefined;

export async function updateReviewStatus(
  reviewId: string,
  status: "approved" | "rejected",
) {
  const supabase = await requireAdminClient();
  await supabase.from("reviews").update({ status }).eq("id", reviewId);
  // The product page reads approved reviews and the rating summary from
  // cache now (lib/data/cached.ts), so approving or rejecting one has to
  // drop that entry -- otherwise a moderated review would keep showing,
  // or stay hidden, until the TTL lapsed.
  updateTag(CACHE_TAGS.reviews);
  revalidatePath("/admin/reviews");
}

export async function deleteReview(reviewId: string) {
  const supabase = await requireAdminClient();
  await supabase.from("reviews").delete().eq("id", reviewId);
  updateTag(CACHE_TAGS.reviews);
  revalidatePath("/admin/reviews");
}

// --- shop replies -----------------------------------------------------
//
// Deliberately separate from updateReviewStatus: replying must never
// publish a review. A pending review that gets a reply stays pending, and
// the reply stays invisible until somebody approves it on purpose. That
// separation is the whole point -- a review was once approved by accident
// simply because it reappeared in the moderation queue.
//
// Every one of these goes through requireAdminClient(), the same guard
// the approve/reject actions use: it checks admin status against the
// database, not the UI, so hiding a button is not what is keeping a
// customer out.

export async function replyToReview(reviewId: string, raw: string): Promise<ReplyResult> {
  // Sanitised and measured before anything touches the database. The
  // length is checked on the CLEANED text because that is what gets
  // stored and what the CHECK constraint measures -- see validateReply.
  const result = validateReply(raw);
  if (!result.ok) return { error: result.error };

  const supabase = await requireAdminClient();

  // The two rules, enforced HERE and not only by hiding a button. The
  // page can be stale, a form can be replayed, and "the button was not
  // shown" protects nobody.
  //
  //   * APPROVED ONLY -- a reply must never be published under a review
  //     the shop is not showing. Decide whether the review belongs on the
  //     site first, then reply to it.
  //   * NOT STAFF-WRITTEN -- those are excluded from the storefront
  //     entirely (product_customer_reviews, sql/081), so a reply under one
  //     is written for nobody.
  const { data: existing } = await supabase
    .from("reviews")
    .select("status, user_id")
    .eq("id", reviewId)
    .maybeSingle();

  if (!existing) return { error: "That review no longer exists." };
  if (existing.status !== "approved") {
    return { error: "Approve this review before replying to it." };
  }

  const { data: author } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", existing.user_id)
    .maybeSingle();

  if (author?.is_admin) {
    return { error: "Staff reviews are not shown in the shop, so they cannot be replied to." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("reviews")
    .update({
      reply_text: result.text,
      replied_at: new Date().toISOString(),
      replied_by: user?.id ?? null,
    })
    .eq("id", reviewId);

  if (error) return { error: error.message };

  // The product page reads replies through the cached review list, so the
  // same tag the approve/reject actions drop has to be dropped here too --
  // otherwise a posted reply would not appear until the TTL lapsed.
  updateTag(CACHE_TAGS.reviews);
  revalidatePath("/admin/reviews");
  return { success: true };
}

export async function removeReviewReply(reviewId: string): Promise<ReplyResult> {
  const supabase = await requireAdminClient();

  // All three fields cleared together. Leaving replied_at or replied_by
  // behind would leave the row claiming a reply that is not there.
  const { error } = await supabase
    .from("reviews")
    .update({ reply_text: null, replied_at: null, replied_by: null })
    .eq("id", reviewId);

  if (error) return { error: error.message };

  updateTag(CACHE_TAGS.reviews);
  revalidatePath("/admin/reviews");
  return { success: true };
}
