import { createClient } from "@/lib/supabase/server";
import { StarRating } from "@/components/product/StarRating";
import { deleteReview, updateReviewStatus } from "@/lib/admin/reviews";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

export default async function AdminReviewsPage() {
  const supabase = await createClient();
  const { data: reviews } = await supabase
    .from("reviews")
    .select("*")
    .order("created_at", { ascending: false });

  const rows = reviews ?? [];
  const productIds = [...new Set(rows.map((r) => r.product_id))];
  const userIds = [...new Set(rows.map((r) => r.user_id))];

  const productNameById = new Map<string, string>();
  if (productIds.length > 0) {
    const { data: products } = await supabase
      .from("products")
      .select("id, name")
      .in("id", productIds);
    for (const p of products ?? []) productNameById.set(p.id, p.name);
  }

  const reviewerNameById = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);
    for (const p of profiles ?? []) reviewerNameById.set(p.id, p.full_name ?? "—");
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold tracking-tight">Reviews</h1>
      <div className="mt-8 flex flex-col gap-4">
        {rows.length === 0 && (
          <p className="text-sm text-[var(--muted)]">No reviews yet.</p>
        )}
        {rows.map((review) => (
          <div
            key={review.id}
            className="rounded-[var(--radius-md)] border border-[var(--border)] p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium">
                  {productNameById.get(review.product_id) ?? "Unknown product"}
                </p>
                <p className="text-xs text-[var(--muted)]">
                  {reviewerNameById.get(review.user_id) ?? "Unknown customer"}
                  {review.verified_purchase && " · Verified Purchase"}
                </p>
              </div>
              <span className="text-xs font-medium tracking-wide uppercase">
                {STATUS_LABELS[review.status] ?? review.status}
              </span>
            </div>

            <div className="mt-2">
              <StarRating rating={review.rating} size="sm" />
            </div>
            {review.title && <p className="mt-2 text-sm font-medium">{review.title}</p>}
            {review.comment && (
              <p className="mt-1 text-sm text-[var(--muted)]">{review.comment}</p>
            )}

            <div className="mt-3 flex gap-3">
              {review.status !== "approved" && (
                <form action={updateReviewStatus.bind(null, review.id, "approved")}>
                  <button type="submit" className="text-sm underline">
                    Approve
                  </button>
                </form>
              )}
              {review.status !== "rejected" && (
                <form action={updateReviewStatus.bind(null, review.id, "rejected")}>
                  <button type="submit" className="text-sm underline">
                    Reject
                  </button>
                </form>
              )}
              <form action={deleteReview.bind(null, review.id)}>
                <button type="submit" className="text-sm text-red-600 underline">
                  Delete
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
