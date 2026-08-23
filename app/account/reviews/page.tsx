import type { Metadata } from "next";
import { getMyReviews, getPendingReviews } from "@/lib/reviews";
import { ReviewsTabs } from "@/components/account/ReviewsTabs";

export const metadata: Metadata = { title: "My Reviews — TrendyMall" };

export default async function AccountReviewsPage() {
  const [myReviews, pending] = await Promise.all([getMyReviews(), getPendingReviews()]);

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold tracking-tight">My Reviews</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Reviews you&apos;ve submitted, and delivered orders still waiting for one.
      </p>
      <div className="mt-6">
        <ReviewsTabs myReviews={myReviews} pending={pending} />
      </div>
    </div>
  );
}
