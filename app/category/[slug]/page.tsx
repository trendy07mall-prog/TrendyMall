import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCategoryBySlug } from "@/lib/data/categories";
import { getProductsByCategory } from "@/lib/data/products";
import { ProductGrid } from "@/components/product/ProductGrid";
import { Breadcrumbs } from "@/components/product/Breadcrumbs";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return { title: "Category not found" };

  const title = `${category.name} Accessories`;
  const description =
    category.description ??
    `Shop ${category.name.toLowerCase()} accessories at TrendyMall.`;
  const image = category.image_path;

  return {
    title,
    description,
    openGraph: {
      title: `${title} | TrendyMall`,
      description,
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | TrendyMall`,
      description,
    },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const products = await getProductsByCategory(category.id);

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-12">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: category.name }]} />
      <h1 className="font-heading mt-4 text-2xl font-bold tracking-tight">
        {category.name}
      </h1>
      {category.description && (
        <p className="mt-2 text-[var(--muted)]">{category.description}</p>
      )}
      <div className="mt-8">
        <ProductGrid products={products} />
      </div>
    </div>
  );
}
