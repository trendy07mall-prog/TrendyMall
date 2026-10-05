/**
 * Pure rules behind the admin Reviews page: which reviews can be replied
 * to, which filter a row belongs in, and what the count boxes say.
 *
 * Kept out of the page component so each rule can be tested on its own --
 * these decide what an admin is allowed to do, and "the button was
 * hidden" is not an answer anyone should rely on. The server action
 * applies the same two gates before writing (see lib/admin/reviews.ts).
 */

export type ReviewStatus = "pending" | "approved" | "rejected";

export type ReviewFilter = "all" | "needs-reply" | "pending" | "approved" | "rejected";

export const REVIEW_FILTERS: { value: ReviewFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "needs-reply", label: "Needs reply" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  // "Hidden", not "Rejected": the stored value stays `rejected` so nothing
  // else in the system has to change, but an admin is hiding a review from
  // the shop, not passing judgement on the customer.
  { value: "rejected", label: "Hidden" },
];

/** The shape the page works with, independent of how it was fetched. */
export interface AdminReviewRow {
  id: string;
  status: ReviewStatus;
  rating: number;
  title: string | null;
  comment: string | null;
  created_at: string;
  reply_text: string | null;
  replied_at: string | null;
  productId: string;
  productName: string;
  productSlug: string | null;
  productImage: string | null;
  reviewerName: string;
  /** Written from an admin account -- already hidden from the shop. */
  isStaffAuthor: boolean;
}

/**
 * Staff-written reviews never get a Reply button.
 *
 * They are excluded from the storefront entirely (product_customer_reviews
 * filters on profiles.is_admin, sql/081), so a reply under one would be
 * written for an audience of nobody -- and it would still inflate the
 * "needs reply" count every time an admin looked at the page.
 */
export function isStaffReview(review: Pick<AdminReviewRow, "isStaffAuthor">): boolean {
  return review.isStaffAuthor;
}

/**
 * Replying is allowed only on an APPROVED, non-staff review.
 *
 * The approved-only rule exists so a reply can never be published under a
 * review the shop is not showing. A pending or hidden review offers
 * Approve / Hide and nothing else: decide whether it belongs on the site
 * first, then reply to it.
 */
export function canReply(review: Pick<AdminReviewRow, "status" | "isStaffAuthor">): boolean {
  return review.status === "approved" && !review.isStaffAuthor;
}

/**
 * "Needs reply" means: a customer is waiting. Approved (so it is actually
 * on the site), not staff-written, and nothing said back yet.
 *
 * A reply of only whitespace counts as no reply -- the database would
 * accept it, and it would be worse than silence on a product page.
 */
export function needsReply(review: Pick<AdminReviewRow, "status" | "isStaffAuthor" | "reply_text">): boolean {
  return canReply(review) && !review.reply_text?.trim();
}

export interface ReviewCounts {
  total: number;
  needsReply: number;
  pending: number;
  approved: number;
  rejected: number;
  /** Mean of every review's rating, or null when there are none. */
  averageRating: number | null;
}

/**
 * The four count boxes, plus the two tab counts.
 *
 * `total` counts every review including staff ones -- it answers "how many
 * reviews exist", which is what an admin reads it as. `needsReply` is the
 * one that deliberately excludes them.
 *
 * averageRating is over ALL reviews, staff included, because it is a
 * summary of this page, not the number shown on the storefront. The public
 * average comes from product_customer_rating_summary, which applies its
 * own staff exclusion.
 */
export function summariseReviews(reviews: AdminReviewRow[]): ReviewCounts {
  const rows = Array.isArray(reviews) ? reviews : [];
  const ratings = rows.map((r) => r.rating).filter((n) => typeof n === "number");

  return {
    total: rows.length,
    needsReply: rows.filter(needsReply).length,
    pending: rows.filter((r) => r.status === "pending").length,
    approved: rows.filter((r) => r.status === "approved").length,
    rejected: rows.filter((r) => r.status === "rejected").length,
    averageRating:
      ratings.length > 0
        ? Math.round((ratings.reduce((sum, n) => sum + n, 0) / ratings.length) * 10) / 10
        : null,
  };
}

/** Anything unrecognised falls back to "all" rather than showing nothing. */
export function parseReviewFilter(raw: string | undefined | null): ReviewFilter {
  const value = (raw ?? "").trim().toLowerCase();
  return REVIEW_FILTERS.some((f) => f.value === value) ? (value as ReviewFilter) : "all";
}

/**
 * Applies the chosen tab and the search box.
 *
 * Search covers the review's own words, who wrote it and which product it
 * is on -- the three things an admin has in mind when they come looking
 * for one. Case-insensitive, and a blank query changes nothing.
 */
export function filterReviews(
  reviews: AdminReviewRow[],
  filter: ReviewFilter,
  query: string,
): AdminReviewRow[] {
  const rows = Array.isArray(reviews) ? reviews : [];

  const byFilter = rows.filter((review) => {
    switch (filter) {
      case "needs-reply":
        return needsReply(review);
      case "pending":
      case "approved":
      case "rejected":
        return review.status === filter;
      default:
        return true;
    }
  });

  const needle = query.trim().toLowerCase();
  if (!needle) return byFilter;

  return byFilter.filter((review) =>
    [review.title, review.comment, review.reviewerName, review.productName, review.reply_text]
      .filter((field): field is string => typeof field === "string" && field.length > 0)
      .some((field) => field.toLowerCase().includes(needle)),
  );
}
