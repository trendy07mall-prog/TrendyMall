"use server";

import { revalidatePath, updateTag } from "next/cache";
import { requireAdminClient } from "@/lib/admin/guard";
import { CACHE_TAGS } from "@/lib/cache-tags";

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
