"use client";

import { useEffect, useState } from "react";
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
  highlightReviewId,
}: {
  productId: string;
  reviews: ReviewWithReviewerName[];
  ratingSummary: ProductRatingSummary | null;
  reviewState: "can_review" | "already_reviewed" | "not_logged_in";
  // Non-null only once ProductTabs has actually switched to this tab (see
  // ProductTabs.tsx) -- by the time that happens, this panel's `hidden`
  // attribute has already flipped off in the same render, so the target
  // row already has real layout to scroll to; no need to poll/wait further.
  highlightReviewId?: string | null;
}) {
  // Computed from the reviews array already on the page -- no new query,
  // no summary column exists for this (product_rating_summary only has
  // avg_rating/review_count), so this is real arithmetic over real rows.
  const breakdownCounts = new Map<number, number>();
  for (const review of reviews) {
    breakdownCounts.set(review.rating, (breakdownCounts.get(review.rating) ?? 0) + 1);
  }

  const [flashedId, setFlashedId] = useState<string | null>(null);

  useEffect(() => {
    if (!highlightReviewId) return;
    const el = document.getElementById(`review-${highlightReviewId}`);
    if (!el) return; // stale/foreign id (e.g. a deleted review) -- no-op, not an error
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    // Syncing to an external signal (the parent's own ?review= param, once
    // its tab has actually activated) -- same class of exception as the
    // localStorage/matchMedia-read effects elsewhere in this app.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFlashedId(highlightReviewId);
    // Fades back out on its own via the transition below rather than
    // vanishing instantly -- "briefly highlight," not a hard flash.
    const timer = setTimeout(() => setFlashedId(null), 2200);
    return () => clearTimeout(timer);
  }, [highlightReviewId]);

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
            id={`review-${review.id}`}
            className={`rounded-[var(--radius-lg)] border p-4 transition-colors duration-700 ease-out ${
              flashedId === review.id
                ? "border-[var(--color-warning)] bg-[var(--color-warning)]/10"
                : "border-[var(--border)]"
            }`}
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
