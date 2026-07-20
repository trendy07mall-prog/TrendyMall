import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProductBySlug } from "@/lib/data/products";
import { getCategoryById } from "@/lib/data/categories";
import { formatPrice } from "@/lib/utils";
import { ProductGallery } from "@/components/product/ProductGallery";
import { AddToCartForm } from "@/components/product/AddToCartForm";
import { BuyNowButton } from "@/components/product/BuyNowButton";
import { WishlistButton } from "@/components/product/WishlistButton";
import { ProductTabs } from "@/components/product/ProductTabs";
import { Breadcrumbs } from "@/components/product/Breadcrumbs";
import { TrustBadges } from "@/components/marketing/TrustBadges";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product not found" };

  const description = product.description.slice(0, 155);
  const image = product.images[0];

  return {
    title: product.name,
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
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const category = await getCategoryById(product.category_id);

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
        <ProductGallery images={product.images} name={product.name} />

        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            {product.name}
          </h1>
          <p className="mt-2 text-xl font-semibold">
            {formatPrice(product.price)}
          </p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
          </p>

          <div className="mt-8 flex flex-col gap-4">
            <AddToCartForm product={product} />
            <div className="flex items-center gap-3">
              <BuyNowButton product={product} />
              <WishlistButton product={product} />
            </div>
          </div>

          <div className="mt-8">
            <TrustBadges compact />
          </div>

          <ProductTabs product={product} categoryName={category?.name ?? "—"} />
        </div>
      </div>
    </div>
  );
}
