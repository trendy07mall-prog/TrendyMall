import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { getProductDetailBySlug, getProductSlugRedirect } from "@/lib/data/products";
import { getCategoryById } from "@/lib/data/categories";
import { PriceDisplay } from "@/components/product/PriceDisplay";
import { ProductGalleryWithVariants } from "@/components/product/ProductGalleryWithVariants";
import { AddToCartForm } from "@/components/product/AddToCartForm";
import { BuyNowButton } from "@/components/product/BuyNowButton";
import { WishlistButton } from "@/components/product/WishlistButton";
import { ProductTabs } from "@/components/product/ProductTabs";
import { WhatsInBox } from "@/components/product/WhatsInBox";
import { Breadcrumbs } from "@/components/product/Breadcrumbs";
import { TrustBadges } from "@/components/marketing/TrustBadges";

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
  const primaryImage = imageUrls[0] ?? null;

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          ...(category
            ? [{ label: category.name, href: `/category/${category.slug}` }]
            : []),
          { label: product.name },
        ]}
      />

      <div className="mt-6 grid gap-10 sm:grid-cols-2">
        <ProductGalleryWithVariants
          images={imageUrls}
          variants={variants}
          name={product.name}
        />

        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            {product.name}
          </h1>
          <div className="mt-2">
            <PriceDisplay
              actualPrice={product.actual_price}
              specialPrice={product.special_price}
            />
          </div>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
          </p>

          <div className="mt-8 flex flex-col gap-4">
            <AddToCartForm product={product} image={primaryImage} />
            <div className="flex items-center gap-3">
              <BuyNowButton product={product} image={primaryImage} />
              <WishlistButton product={product} image={primaryImage} />
            </div>
          </div>

          <WhatsInBox items={product.whats_in_box} />

          <div className="mt-8">
            <TrustBadges compact />
          </div>

          <ProductTabs product={product} categoryName={category?.name ?? "—"} />
        </div>
      </div>
    </div>
  );
}
