"use server";

import { revalidatePath } from "next/cache";
import { requireAdminClient } from "@/lib/admin/guard";

export async function updateReviewStatus(
  reviewId: string,
  status: "approved" | "rejected",
) {
  const supabase = await requireAdminClient();
  await supabase.from("reviews").update({ status }).eq("id", reviewId);
  revalidatePath("/admin/reviews");
}

export async function deleteReview(reviewId: string) {
  const supabase = await requireAdminClient();
  await supabase.from("reviews").delete().eq("id", reviewId);
  revalidatePath("/admin/reviews");
}
