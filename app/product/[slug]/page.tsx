import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProductBySlug } from "@/lib/data/products";
import { formatPrice } from "@/lib/utils";
import { ProductGallery } from "@/components/product/ProductGallery";
import { AddToCartForm } from "@/components/product/AddToCartForm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  return { title: product ? `${product.name} — TrendyMall` : "TrendyMall" };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  return (
    <div className="mx-auto grid w-full max-w-5xl flex-1 gap-10 px-6 py-12 sm:grid-cols-2">
      <ProductGallery images={product.images} name={product.name} />

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {product.name}
        </h1>
        <p className="mt-2 text-xl">{formatPrice(product.price)}</p>
        <p className="mt-6 whitespace-pre-line text-zinc-600 dark:text-zinc-400">
          {product.description}
        </p>
        <p className="mt-4 text-sm text-zinc-500">
          {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
        </p>
        <div className="mt-8">
          <AddToCartForm product={product} />
        </div>
      </div>
    </div>
  );
}
