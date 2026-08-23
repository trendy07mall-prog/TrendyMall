"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { StarRating } from "@/components/product/StarRating";
import type { MyReview, PendingReviewItem } from "@/lib/reviews";

type Tab = "my-reviews" | "pending";

// Same tab-button markup OrderFilterTabs.tsx established, matching
// CouponsTabs.tsx's reuse of it -- local state, both lists are already
// fully fetched server-side by the page.
export function ReviewsTabs({
  myReviews,
  pending,
}: {
  myReviews: MyReview[];
  pending: PendingReviewItem[];
}) {
  const [tab, setTab] = useState<Tab>(pending.length > 0 ? "pending" : "my-reviews");

  const TABS: { value: Tab; label: string; count: number }[] = [
    { value: "pending", label: "Pending Reviews", count: pending.length },
    { value: "my-reviews", label: "My Reviews", count: myReviews.length },
  ];

  return (
    <div>
      <div className="flex gap-1 overflow-x-auto">
        {TABS.map((t) => {
          const isActive = tab === t.value;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              aria-current={isActive ? "true" : undefined}
              className={`transition-brand min-h-11 shrink-0 rounded-full px-4 text-sm font-medium whitespace-nowrap ${
                isActive ? "bg-[var(--foreground)] text-white" : "border border-[var(--border)] hover:bg-black/5"
              }`}
            >
              {t.label} ({t.count})
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        {tab === "pending" ? <PendingList items={pending} /> : <MyReviewsList reviews={myReviews} />}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[var(--radius-card)] border border-dashed border-[var(--border)] px-6 py-16 text-center">
      <p className="text-sm text-[var(--muted)]">{message}</p>
    </div>
  );
}

function PendingList({ items }: { items: PendingReviewItem[] }) {
  if (items.length === 0) return <EmptyState message="No delivered orders are waiting for a review." />;
  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <li
          key={item.productId}
          className="flex items-center gap-3 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--color-card)] p-3"
        >
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-black/5">
            {item.productImage && (
              <Image src={item.productImage} alt="" fill sizes="48px" className="object-cover" />
            )}
          </div>
          <p className="min-w-0 flex-1 truncate text-sm font-medium">{item.productName}</p>
          {item.productSlug && (
            <Link
              href={`/product/${item.productSlug}`}
              className="transition-brand inline-flex min-h-11 shrink-0 items-center rounded-full border border-[var(--border)] px-4 text-sm font-medium hover:bg-black/5"
            >
              Write a review
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}

function MyReviewsList({ reviews }: { reviews: MyReview[] }) {
  if (reviews.length === 0) return <EmptyState message="You haven't submitted any reviews yet." />;
  return (
    <ul className="flex flex-col gap-3">
      {reviews.map((review) => (
        <li
          key={review.id}
          className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--color-card)] p-4"
        >
          <div className="flex items-start gap-3">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-black/5">
              {review.productImage && (
                <Image src={review.productImage} alt="" fill sizes="48px" className="object-cover" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {review.productSlug ? (
                  <Link href={`/product/${review.productSlug}`} className="text-sm font-medium hover:underline">
                    {review.productName}
                  </Link>
                ) : (
                  <p className="text-sm font-medium">{review.productName}</p>
                )}
                {review.verified_purchase && (
                  <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-semibold text-[var(--color-text-secondary)] uppercase">
                    Verified Purchase
                  </span>
                )}
                {review.status === "pending" && (
                  <span className="rounded-full bg-[var(--color-warning)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--color-warning)] uppercase">
                    Pending moderation
                  </span>
                )}
                {review.status === "rejected" && (
                  <span className="rounded-full bg-[var(--color-error)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--color-error)] uppercase">
                    Not published
                  </span>
                )}
              </div>
              <div className="mt-1">
                <StarRating rating={review.rating} size="sm" />
              </div>
              {review.title && <p className="mt-1 text-sm font-medium">{review.title}</p>}
              {review.comment && <p className="mt-1 text-sm text-[var(--muted)]">{review.comment}</p>}
              <p className="mt-2 text-xs text-[var(--muted)]">
                {new Date(review.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
