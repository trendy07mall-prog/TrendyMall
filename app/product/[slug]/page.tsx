import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import {
  getProductDetailBySlug,
  getProductSlugRedirect,
  getRelatedProducts,
} from "@/lib/data/products";
import { getCategoryById } from "@/lib/data/categories";
import { getProductRatingSummary, getProductReviews, hasUserReviewed } from "@/lib/reviews";
import { createClient } from "@/lib/supabase/server";
import { Breadcrumbs } from "@/components/product/Breadcrumbs";
import { ProductPurchaseSection } from "@/components/product/ProductPurchaseSection";
import { RelatedProducts } from "@/components/product/RelatedProducts";
import { RecordRecentlyViewed } from "@/components/product/RecordRecentlyViewed";
import { RecentlyViewedSection } from "@/components/product/RecentlyViewedSection";
import { JsonLd } from "@/components/seo/JsonLd";
import { getEffectivePrice } from "@/lib/utils";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const detail = await getProductDetailBySlug(slug);
  if (!detail) return { title: "Product not found" };

  const { product, images } = detail;
  const description =
    product.meta_description ?? product.description.replace(/<[^>]+>/g, "").slice(0, 155);
  const image = images[0]?.image_url;

  return {
    title: product.meta_title ?? product.name,
    description,
    openGraph: {
      title: `${product.name} | TrendyMall`,
      description,
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.name} | TrendyMall`,
      description,
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const detail = await getProductDetailBySlug(slug);
  if (!detail) {
    const redirectSlug = await getProductSlugRedirect(slug);
    if (redirectSlug) permanentRedirect(`/product/${redirectSlug}`);
    notFound();
  }

  const { product, images, variants } = detail;
  const category = await getCategoryById(product.category_id);
  const imageUrls = images.map((i) => i.image_url);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [relatedProducts, reviews, ratingSummary, alreadyReviewed] = await Promise.all([
    getRelatedProducts(product.category_id, product.id),
    getProductReviews(product.id),
    getProductRatingSummary(product.id),
    user ? hasUserReviewed(product.id, user.id) : Promise.resolve(false),
  ]);

  const reviewState = !user
    ? ("not_logged_in" as const)
    : alreadyReviewed
      ? ("already_reviewed" as const)
      : ("can_review" as const);

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
      price: getEffectivePrice(product),
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
    <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <JsonLd data={productSchema} />
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          ...(category
            ? [{ label: category.name, href: `/category/${category.slug}` }]
            : []),
          { label: product.name },
        ]}
      />

      <ProductPurchaseSection
        product={product}
        images={imageUrls}
        variants={variants}
        categoryName={category?.name ?? "—"}
        reviews={reviews}
        ratingSummary={ratingSummary}
        reviewState={reviewState}
      />

      <RelatedProducts products={relatedProducts} />
      <RecentlyViewedSection excludeProductId={product.id} />

      <RecordRecentlyViewed
        productId={product.id}
        slug={product.slug}
        name={product.name}
        image={imageUrls[0] ?? null}
        price={getEffectivePrice(product)}
      />
    </div>
  );
}
