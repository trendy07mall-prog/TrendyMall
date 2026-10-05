import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StarRating } from "@/components/product/StarRating";
import { ReviewActions } from "@/components/admin/ReviewActions";
import { ReviewReplyForm } from "@/components/admin/ReviewReplyForm";
import { ReviewFilters } from "@/components/admin/ReviewFilters";
import { ReviewSummaryCards } from "@/components/admin/ReviewSummaryCards";
import { StatusBadge, type StatusTone } from "@/components/ui/StatusBadge";
import {
  type AdminReviewRow,
  canReply,
  filterReviews,
  isStaffReview,
  parseReviewFilter,
  summariseReviews,
} from "@/lib/admin/reviews-query";

// "Hidden", not "Rejected" -- an admin is deciding whether a review
// appears in the shop, not judging the customer. The stored value is
// still `rejected`; only the wording changed.
const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Hidden",
};

const STATUS_TONES: Record<string, StatusTone> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
};

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filter = parseReviewFilter(typeof sp.filter === "string" ? sp.filter : undefined);
  const query = typeof sp.q === "string" ? sp.q : "";

  const supabase = await createClient();
  const { data: reviews } = await supabase
    .from("reviews")
    .select("*")
    .order("created_at", { ascending: false });

  const raw = reviews ?? [];
  const productIds = [...new Set(raw.map((r) => r.product_id))];
  const userIds = [...new Set(raw.map((r) => r.user_id))];

  // Products: name, slug and primary image for the small product link.
  const productById = new Map<string, { name: string; slug: string | null; image: string | null }>();
  if (productIds.length > 0) {
    const [{ data: products }, { data: images }] = await Promise.all([
      supabase.from("products").select("id, name, slug").in("id", productIds),
      supabase
        .from("product_images")
        .select("product_id, image_url, sort_order")
        .in("product_id", productIds)
        .order("sort_order", { ascending: true }),
    ]);

    // First image per product wins -- the list is already sorted, so the
    // first one seen for an id is its primary.
    const imageByProduct = new Map<string, string>();
    for (const img of images ?? []) {
      if (!imageByProduct.has(img.product_id)) imageByProduct.set(img.product_id, img.image_url);
    }
    for (const p of products ?? []) {
      productById.set(p.id, {
        name: p.name,
        slug: p.slug,
        image: imageByProduct.get(p.id) ?? null,
      });
    }
  }

  // is_admin is what decides "Staff review" -- the same flag the
  // storefront view uses to keep these off product pages (sql/081). Read
  // here so the admin page agrees with what customers actually see.
  const profileById = new Map<string, { name: string; isAdmin: boolean }>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, is_admin")
      .in("id", userIds);
    for (const p of profiles ?? []) {
      profileById.set(p.id, { name: p.full_name ?? "—", isAdmin: Boolean(p.is_admin) });
    }
  }

  const rows: AdminReviewRow[] = raw.map((review) => {
    const product = productById.get(review.product_id);
    const profile = profileById.get(review.user_id);
    return {
      id: review.id,
      status: review.status,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      created_at: review.created_at,
      reply_text: review.reply_text,
      replied_at: review.replied_at,
      productId: review.product_id,
      productName: product?.name ?? "Unknown product",
      productSlug: product?.slug ?? null,
      productImage: product?.image ?? null,
      reviewerName: profile?.name ?? "Unknown customer",
      isStaffAuthor: profile?.isAdmin ?? false,
    };
  });

  // Counts are over EVERY review, not the filtered view -- a tab showing
  // "3" that becomes "0" once you click it would be useless.
  const counts = summariseReviews(rows);
  const visible = filterReviews(rows, filter, query);

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold tracking-tight">Reviews</h1>

      <ReviewSummaryCards counts={counts} />
      <ReviewFilters basePath="/admin/reviews" filter={filter} query={query} counts={counts} />

      <div className="mt-6 flex flex-col gap-4">
        {rows.length === 0 && <p className="text-sm text-[var(--muted)]">No reviews yet.</p>}

        {rows.length > 0 && visible.length === 0 && (
          <p className="text-sm text-[var(--muted)]">
            No reviews match this filter{query.trim() ? ` and “${query.trim()}”` : ""}.
          </p>
        )}

        {visible.map((review) => {
          const staff = isStaffReview(review);
          const replyAllowed = canReply(review);

          return (
            <div
              key={review.id}
              className="rounded-[var(--radius-md)] border border-[var(--border)] p-4"
            >
              {/* Product first: an admin scanning this list is usually
                  looking for a product, not a customer. */}
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  {review.productImage && (
                    <Image
                      src={review.productImage}
                      alt=""
                      width={36}
                      height={36}
                      className="h-9 w-9 shrink-0 rounded-[var(--radius-sm)] border border-[var(--border)] object-cover"
                    />
                  )}
                  <div className="min-w-0">
                    {review.productSlug ? (
                      <Link
                        href={`/product/${review.productSlug}`}
                        target="_blank"
                        className="truncate text-sm font-medium underline-offset-2 hover:underline"
                      >
                        {review.productName}
                      </Link>
                    ) : (
                      <p className="truncate text-sm font-medium">{review.productName}</p>
                    )}
                    <p className="text-xs text-[var(--muted)]">
                      {review.reviewerName}
                      {" · "}
                      {dateFormatter.format(new Date(review.created_at))}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {staff && (
                    // Explains why there is no Reply button here, rather
                    // than leaving a gap an admin has to work out.
                    <span className="rounded-full border border-[var(--border)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--color-text-secondary)]">
                      Staff review
                    </span>
                  )}
                  <StatusBadge tone={STATUS_TONES[review.status] ?? "neutral"}>
                    {STATUS_LABELS[review.status] ?? review.status}
                  </StatusBadge>
                </div>
              </div>

              <div className="mt-2.5">
                <StarRating rating={review.rating} size="sm" />
              </div>
              {review.title && <p className="mt-2 text-sm font-medium">{review.title}</p>}
              {review.comment && (
                <p className="mt-1 text-sm whitespace-pre-line text-[var(--muted)]">{review.comment}</p>
              )}

              {/* Staff reviews get no reply UI at all -- they never reach
                  a product page, so there is nobody to reply to. */}
              {!staff && (
                <ReviewReplyForm
                  reviewId={review.id}
                  existingReply={review.reply_text}
                  repliedAt={review.replied_at}
                  canReply={replyAllowed}
                />
              )}

              {!staff && !replyAllowed && !review.reply_text && (
                <p className="mt-3 text-xs text-[var(--muted)]">
                  {review.status === "pending"
                    ? "Approve this review before replying to it."
                    : "This review is hidden from the shop, so it cannot be replied to."}
                </p>
              )}

              <ReviewActions
                reviewId={review.id}
                status={review.status}
                hasReply={Boolean(review.reply_text)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
