import { after } from "next/server";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { getProductSlugRedirect, incrementProductViewCount } from "@/lib/data/products";
import {
  getCachedCategoryWithAncestors,
  getCachedProductDetailBySlug,
  getCachedProductRatingSummary,
  getCachedProductReviews,
  getCachedProductSpecs,
  getCachedProductTags,
  getCachedRelatedProducts,
} from "@/lib/data/cached";
import { getActiveDeliveryZones } from "@/lib/data/delivery-zones";
import { hasUserReviewed } from "@/lib/reviews";
import { getAuthUser } from "@/lib/supabase/server";
import { Breadcrumbs } from "@/components/product/Breadcrumbs";
import { ProductPurchaseSection } from "@/components/product/ProductPurchaseSection";
import { RelatedProducts } from "@/components/product/RelatedProducts";
import { RecordRecentlyViewed } from "@/components/product/RecordRecentlyViewed";
import { RecentlyViewedSection } from "@/components/product/RecentlyViewedSection";
import { JsonLd } from "@/components/seo/JsonLd";
import { getVariantPrice, pickWinningVariant } from "@/lib/utils";
import { SITE_URL as siteUrl } from "@/lib/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const detail = await getCachedProductDetailBySlug(slug);
  if (!detail) return { title: "Product not found" };

  const { product, images } = detail;
  const description =
    product.meta_description ?? product.description.replace(/<[^>]+>/g, "").slice(0, 155);
  const image = images[0]?.image_url;

  return {
    title: product.meta_title ?? product.name,
    description,
    alternates: {
      canonical: `/product/${product.slug}`,
    },
    openGraph: {
      title: `${product.name} | TrendyMall`,
      description,
      url: `/product/${product.slug}`,
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.name} | TrendyMall`,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const detail = await getCachedProductDetailBySlug(slug);
  if (!detail) {
    const redirectSlug = await getProductSlugRedirect(slug);
    if (redirectSlug) permanentRedirect(`/product/${redirectSlug}`);
    notFound();
  }

  const { product, images, variants, attributes: productAttributes } = detail;
  // Keeps the breadcrumb trail on one line -- a long product name is the
  // one item here with no natural length cap (category names are short by
  // convention). Display-only: the page's own <h1>/metadata still use the
  // full, untruncated product.name.
  const breadcrumbProductName =
    product.name.length > 40 ? `${product.name.slice(0, 40).trimEnd()}…` : product.name;
  const imageUrls = images.map((i) => i.image_url);

  // after() rather than await: a view-count bump is bookkeeping, and
  // awaiting it put a full Supabase round trip (~200ms measured) in front
  // of the page every single time. It still must not be a detached
  // promise -- Vercel's runtime can cut those off once the response is
  // sent -- and after() is exactly the supported form of "real background
  // work the platform keeps the function alive for", the same guarantee
  // proxy.ts already relies on via event.waitUntil.
  // incrementProductViewCount still swallows its own errors.
  after(() => incrementProductViewCount(product.id));

  // Started, not awaited, so the one read that depends on it can join the
  // wave below instead of serialising in front of it. getAuthUser is
  // cache()d, so awaiting it again afterwards costs nothing, and for a
  // logged-out visitor it never touches the network at all.
  const authUser = getAuthUser();

  // One wave, not five. Everything public here is cached (see
  // lib/data/cached.ts) and keyed on ids that come from the already-cached
  // detail payload; "have I reviewed this?" is the only per-visitor read
  // and stays live. The page shows exactly the same values as before --
  // these are the same functions, just cached and no longer chained.
  const [categoryInfo, relatedProducts, reviews, ratingSummary, alreadyReviewed, tags, specs, zones] =
    await Promise.all([
      getCachedCategoryWithAncestors(product.category_id),
      getCachedRelatedProducts(product.category_id, product.id),
      getCachedProductReviews(product.id),
      getCachedProductRatingSummary(product.id),
      authUser.then(({ data: { user } }) =>
        user ? hasUserReviewed(product.id, user.id) : false,
      ),
      getCachedProductTags(product.id),
      getCachedProductSpecs(product.id, product.category_id),
      getActiveDeliveryZones(),
    ]);
  const { category, ancestors: categoryAncestors } = categoryInfo;

  const {
    data: { user },
  } = await authUser;

  const reviewState = !user
    ? ("not_logged_in" as const)
    : alreadyReviewed
      ? ("already_reviewed" as const)
      : ("can_review" as const);

  // Same default-variant tie-break as ProductPurchaseSection's own
  // defaultDimensions (first in stock, in sort_order, else first overall)
  // -- the JSON-LD/recently-viewed price shown here must match what the
  // page itself opens on.
  const defaultVariant = variants.length > 0 ? pickWinningVariant(variants) : null;
  const defaultVariantPrice = defaultVariant ? getVariantPrice(defaultVariant) : 0;

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: imageUrls,
    description: product.description.replace(/<[^>]+>/g, "").slice(0, 500),
    sku: product.sku ?? undefined,
    brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
    offers: {
      "@type": "Offer",
      url: `${siteUrl}/product/${product.slug}`,
      priceCurrency: "LKR",
      price: defaultVariantPrice,
      availability:
        product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
    ...(ratingSummary && ratingSummary.review_count > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: ratingSummary.avg_rating,
            reviewCount: ratingSummary.review_count,
          },
        }
      : {}),
  };

  return (
    <div className="mx-auto w-full max-w-[var(--container-width)] flex-1 px-6 py-10">
      <JsonLd data={productSchema} />
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          ...categoryAncestors.map((ancestor) => ({
            label: ancestor.name,
            href: `/category/${ancestor.slug}`,
          })),
          { label: breadcrumbProductName },
        ]}
      />

      <ProductPurchaseSection
        product={product}
        images={imageUrls}
        variants={variants}
        attributes={productAttributes}
        categoryName={category?.name ?? "—"}
        specs={specs}
        reviews={reviews}
        ratingSummary={ratingSummary}
        reviewState={reviewState}
        tags={tags}
        zones={zones}
      />

      <RelatedProducts products={relatedProducts} />
      <RecentlyViewedSection excludeProductIds={[product.id]} />

      <RecordRecentlyViewed
        productId={product.id}
        slug={product.slug}
        name={product.name}
        image={imageUrls[0] ?? null}
        price={defaultVariantPrice}
      />
    </div>
  );
}
