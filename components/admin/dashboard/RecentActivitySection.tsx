import Link from "next/link";
import { StarRating } from "@/components/product/StarRating";
import { StarIcon, MailIcon } from "@/components/ui/Icon";
import type { RecentReviewRow, NewSubscriberRow } from "@/lib/admin/dashboard-query";

export function RecentActivitySection({
  reviews,
  subscribers,
}: {
  reviews: RecentReviewRow[];
  subscribers: NewSubscriberRow[];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-white p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Recent Reviews</h3>
          <Link href="/admin/reviews" className="text-xs font-medium text-[#0F2D52] hover:underline">
            View All →
          </Link>
        </div>
        {reviews.length === 0 ? (
          <div className="mt-4 flex flex-col items-center gap-2 py-6 text-center">
            <StarIcon className="h-6 w-6 text-[var(--color-text-secondary)]" />
            <p className="text-sm text-[var(--color-text-secondary)]">No reviews yet.</p>
          </div>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {reviews.map((review) => (
              <li key={review.id} className="flex flex-col gap-1 border-t border-[var(--border)] pt-3 first:border-t-0 first:pt-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{review.productName}</p>
                  {review.isNew && (
                    <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                      New
                    </span>
                  )}
                </div>
                <StarRating rating={review.rating} size="sm" />
                <p className="text-xs text-[var(--color-text-secondary)]">{review.reviewerName}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-white p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">New Subscribers</h3>
          <Link href="/admin/subscribers" className="text-xs font-medium text-[#0F2D52] hover:underline">
            View All →
          </Link>
        </div>
        {subscribers.length === 0 ? (
          <div className="mt-4 flex flex-col items-center gap-2 py-6 text-center">
            <MailIcon className="h-6 w-6 text-[var(--color-text-secondary)]" />
            <p className="text-sm text-[var(--color-text-secondary)]">No subscribers yet.</p>
          </div>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {subscribers.map((subscriber) => (
              <li
                key={subscriber.id}
                className="flex items-center justify-between border-t border-[var(--border)] pt-2 text-sm first:border-t-0 first:pt-0"
              >
                <span className="truncate">{subscriber.email}</span>
                <span className="shrink-0 text-xs text-[var(--color-text-secondary)]">
                  {new Date(subscriber.createdAt).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
