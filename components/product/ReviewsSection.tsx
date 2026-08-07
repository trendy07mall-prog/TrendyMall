import Link from "next/link";
import { StarRating } from "@/components/product/StarRating";
import { ReviewForm } from "@/components/product/ReviewForm";
import type { ProductRatingSummary } from "@/types";
import type { ReviewWithReviewerName } from "@/lib/reviews";

const dateFormatter = new Intl.DateTimeFormat("en-LK", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

const BREAKDOWN_STARS = [5, 4, 3, 2, 1];

export function ReviewsSection({
  productId,
  reviews,
  ratingSummary,
  reviewState,
}: {
  productId: string;
  reviews: ReviewWithReviewerName[];
  ratingSummary: ProductRatingSummary | null;
  reviewState: "can_review" | "already_reviewed" | "not_logged_in";
}) {
  // Computed from the reviews array already on the page -- no new query,
  // no summary column exists for this (product_rating_summary only has
  // avg_rating/review_count), so this is real arithmetic over real rows.
  const breakdownCounts = new Map<number, number>();
  for (const review of reviews) {
    breakdownCounts.set(review.rating, (breakdownCounts.get(review.rating) ?? 0) + 1);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
        <div className="flex items-center gap-3">
          <StarRating rating={ratingSummary?.avg_rating ?? 0} size="lg" />
          <span className="text-sm text-[var(--muted)]">
            {ratingSummary
              ? `${ratingSummary.avg_rating} out of 5 (${ratingSummary.review_count} review${
                  ratingSummary.review_count === 1 ? "" : "s"
                })`
              : "No reviews yet"}
          </span>
        </div>

        {reviews.length > 0 && (
          <div className="flex flex-col gap-1">
            {BREAKDOWN_STARS.map((star) => {
              const count = breakdownCounts.get(star) ?? 0;
              const percent = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-2 text-xs text-[var(--muted)]">
                  <span className="w-8 shrink-0">{star}★</span>
                  <span className="h-1.5 w-28 overflow-hidden rounded-full bg-[var(--border)]">
                    <span
                      className="block h-full rounded-full bg-yellow-500"
                      style={{ width: `${percent}%` }}
                    />
                  </span>
                  <span className="w-5 shrink-0 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {reviewState === "can_review" && <ReviewForm productId={productId} />}
      {reviewState === "already_reviewed" && (
        <p className="text-sm text-[var(--muted)]">
          You&apos;ve already reviewed this product.
        </p>
      )}
      {reviewState === "not_logged_in" && (
        <p className="text-sm text-[var(--muted)]">
          <Link href="/login" className="underline">
            Log in
          </Link>{" "}
          to write a review.
        </p>
      )}

      <div className="flex flex-col gap-4">
        {reviews.length === 0 && (
          <p className="text-sm text-[var(--muted)]">No reviews yet — be the first!</p>
        )}
        {reviews.map((review) => (
          <div
            key={review.id}
            className="rounded-[var(--radius-lg)] border border-[var(--border)] p-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <StarRating rating={review.rating} size="sm" />
              {review.verified_purchase && (
                <span className="text-[10px] font-semibold tracking-wide text-[var(--color-success)] uppercase">
                  Verified Purchase
                </span>
              )}
            </div>
            {review.title && <p className="mt-1.5 text-sm font-medium">{review.title}</p>}
            {review.comment && (
              <p className="mt-1 text-sm text-[var(--muted)]">{review.comment}</p>
            )}
            <p className="mt-2 text-xs text-[var(--muted)]">
              {review.reviewerName} · {dateFormatter.format(new Date(review.created_at))}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
