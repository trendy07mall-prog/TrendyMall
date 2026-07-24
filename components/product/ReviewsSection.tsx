import Link from "next/link";
import { StarRating } from "@/components/product/StarRating";
import { ReviewForm } from "@/components/product/ReviewForm";
import type { ProductRatingSummary } from "@/types";
import type { ReviewWithReviewerName } from "@/lib/reviews";

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
  return (
    <div className="flex flex-col gap-6">
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
          <div key={review.id} className="border-b border-[var(--border)] pb-4">
            <div className="flex items-center gap-2">
              <StarRating rating={review.rating} size="sm" />
              {review.verified_purchase && (
                <span className="text-[10px] font-semibold tracking-wide text-green-700 uppercase">
                  Verified Purchase
                </span>
              )}
            </div>
            {review.title && <p className="mt-1 text-sm font-medium">{review.title}</p>}
            {review.comment && (
              <p className="mt-1 text-sm text-[var(--muted)]">{review.comment}</p>
            )}
            <p className="mt-1 text-xs text-[var(--muted)]">{review.reviewerName}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
