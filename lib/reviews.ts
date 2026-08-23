import { createClient } from "@/lib/supabase/server";
import type { ProductRatingSummary, Review } from "@/types";

export interface ReviewWithReviewerName extends Review {
  reviewerName: string;
}

export async function getProductReviews(
  productId: string,
): Promise<ReviewWithReviewerName[]> {
  const supabase = await createClient();
  const { data: reviews, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("product_id", productId)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (error) throw error;
  if (!reviews || reviews.length === 0) return [];

  const userIds = [...new Set(reviews.map((r) => r.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", userIds);

  const nameByUserId = new Map(
    (profiles ?? []).map((p) => [p.id, p.full_name] as const),
  );

  return reviews.map((review) => ({
    ...review,
    reviewerName: nameByUserId.get(review.user_id) || "Verified Customer",
  }));
}

export async function getProductRatingSummary(
  productId: string,
): Promise<ProductRatingSummary | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("product_rating_summary")
    .select("*")
    .eq("product_id", productId)
    .maybeSingle();

  return data;
}

export interface FeaturedReview {
  id: string;
  rating: number;
  title: string | null;
  comment: string;
  createdAt: string;
  reviewerName: string;
  productName: string;
  productSlug: string;
}

// Site-wide (not scoped to one product), for the homepage's Customer
// Reviews section — only ever real, approved reviews (never fabricated
// placeholders). Highest-rated first, capped small since this is a
// homepage teaser, not a full reviews listing.
export async function getFeaturedReviews(limit = 6): Promise<FeaturedReview[]> {
  const supabase = await createClient();
  const { data: reviews, error } = await supabase
    .from("reviews")
    .select("id, rating, title, comment, created_at, user_id, product_id")
    .eq("status", "approved")
    .order("rating", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  if (!reviews || reviews.length === 0) return [];

  const userIds = [...new Set(reviews.map((r) => r.user_id))];
  const productIds = [...new Set(reviews.map((r) => r.product_id).filter((id): id is string => Boolean(id)))];

  const [{ data: profiles }, { data: products }] = await Promise.all([
    supabase.from("profiles").select("id, full_name").in("id", userIds),
    supabase.from("products").select("id, name, slug").in("id", productIds),
  ]);

  const nameByUserId = new Map((profiles ?? []).map((p) => [p.id, p.full_name] as const));
  const productById = new Map((products ?? []).map((p) => [p.id, p] as const));

  return reviews
    .map((review) => {
      const product = review.product_id ? productById.get(review.product_id) : undefined;
      if (!product) return null;
      return {
        id: review.id,
        rating: review.rating,
        title: review.title,
        comment: review.comment,
        createdAt: review.created_at,
        reviewerName: nameByUserId.get(review.user_id) || "Verified Customer",
        productName: product.name,
        productSlug: product.slug,
      };
    })
    .filter((r): r is FeaturedReview => r != null);
}

// Overview page's Reviews summary card — a plain count, RLS-scoped to the
// caller's own rows (reviews_select_own_or_admin), same pattern as
// lib/addresses.ts's getMyAddresses().length usage elsewhere on that page.
export async function getMyReviewCount(): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count } = await supabase
    .from("reviews")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  return count ?? 0;
}

export interface MyReview extends Review {
  productName: string;
  productSlug: string;
  productImage: string | null;
}

// My Reviews tab — RLS-scoped to the caller's own rows, newest first.
// status ('pending'|'approved'|'rejected') is returned as-is so the UI can
// show an honest "pending moderation" note instead of implying a review is
// already live when it isn't.
export async function getMyReviews(): Promise<MyReview[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: reviews } = await supabase
    .from("reviews")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (!reviews || reviews.length === 0) return [];

  const productIds = [...new Set(reviews.map((r) => r.product_id))];
  const [{ data: products }, { data: images }] = await Promise.all([
    supabase.from("products").select("id, name, slug").in("id", productIds),
    supabase
      .from("product_images")
      .select("product_id, image_url, sort_order")
      .in("product_id", productIds)
      .order("sort_order", { ascending: true }),
  ]);

  const productById = new Map((products ?? []).map((p) => [p.id, p] as const));
  const imageByProductId = new Map<string, string>();
  for (const image of images ?? []) {
    if (!imageByProductId.has(image.product_id)) imageByProductId.set(image.product_id, image.image_url);
  }

  return reviews.map((review) => {
    const product = productById.get(review.product_id);
    return {
      ...review,
      productName: product?.name ?? "Product",
      productSlug: product?.slug ?? "",
      productImage: imageByProductId.get(review.product_id) ?? null,
    };
  });
}

export interface PendingReviewItem {
  productId: string;
  productName: string;
  productImage: string | null;
  productSlug: string;
}

// Reliably determinable, so it's built (not omitted): this customer's
// DELIVERED orders' items, minus products they've already reviewed. Each
// prompt links to /product/[slug], where the existing ReviewForm.tsx
// already handles submission -- no new review-writing UI here.
export async function getPendingReviews(): Promise<PendingReviewItem[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const [{ data: orders }, { data: myReviews }] = await Promise.all([
    supabase
      .from("orders")
      .select("order_items(product_id, product_name, product_image_url)")
      .eq("user_id", user.id)
      .eq("order_status", "delivered"),
    supabase.from("reviews").select("product_id").eq("user_id", user.id),
  ]);

  const reviewedProductIds = new Set((myReviews ?? []).map((r) => r.product_id));
  const seenProductIds = new Set<string>();
  const pending: { productId: string; productName: string; productImage: string | null }[] = [];

  // order_items(...) is a raw select-string join, not a typed relationship
  // query -- same pragmatic escape hatch lib/account/orders-query.ts and
  // lib/orders/order-detail.ts already use for the equivalent join.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const order of (orders ?? []) as any[]) {
    const items = (order.order_items ?? []) as {
      product_id: string | null;
      product_name: string;
      product_image_url: string | null;
    }[];
    for (const item of items) {
      if (!item.product_id) continue;
      if (reviewedProductIds.has(item.product_id)) continue;
      if (seenProductIds.has(item.product_id)) continue;
      seenProductIds.add(item.product_id);
      pending.push({
        productId: item.product_id,
        productName: item.product_name,
        productImage: item.product_image_url,
      });
    }
  }

  if (pending.length === 0) return [];

  const { data: products } = await supabase
    .from("products")
    .select("id, slug")
    .in("id", pending.map((p) => p.productId));
  const slugById = new Map((products ?? []).map((p) => [p.id, p.slug]));

  return pending.map((p) => ({ ...p, productSlug: slugById.get(p.productId) ?? "" }));
}

export async function hasUserReviewed(
  productId: string,
  userId: string,
): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reviews")
    .select("id")
    .eq("product_id", productId)
    .eq("user_id", userId)
    .maybeSingle();

  return data != null;
}

