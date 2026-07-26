import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCategories, getCategoryBySlug } from "@/lib/data/categories";
import {
  getFacetCounts,
  getProductsByCategory,
  getPublishedProductCount,
  hasAnyApprovedReviews,
} from "@/lib/data/products";
import { parseProductFilterState, toProductListFilters } from "@/lib/product-filters";
import { ProductGrid } from "@/components/product/ProductGrid";
import { FilterSidebar } from "@/components/product/FilterSidebar";
import { MobileFilterSortBar } from "@/components/product/MobileFilterSortBar";
import { FilterChips } from "@/components/product/FilterChips";
import { SortBar } from "@/components/product/SortBar";
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
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const sp = await searchParams;
  const state = parseProductFilterState(sp);
  const allCategories = await getCategories();
  const filters = toProductListFilters(state, allCategories);
  const basePath = `/category/${category.slug}`;

  const [products, totalCount, facetCounts, hasReviews] = await Promise.all([
    getProductsByCategory(category.id, filters),
    getPublishedProductCount(category.id),
    getFacetCounts(filters, { categoryId: category.id, includeCategoryFacet: false }),
    hasAnyApprovedReviews(),
  ]);

  return (
    <div className="mx-auto w-full max-w-[var(--container-width)] flex-1 px-6 py-12">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: category.name }]} />
      <h1 className="font-heading mt-4 text-2xl font-bold tracking-tight">
        {category.name}
      </h1>
      {category.description && (
        <p className="mt-2 text-[var(--muted)]">{category.description}</p>
      )}

      <div className="mt-6">
        <MobileFilterSortBar
          basePath={basePath}
          state={state}
          categories={facetCounts.categories}
          brands={facetCounts.brands}
          showCategoryFacet={false}
          showRatingFacet={hasReviews}
        />
      </div>

      <div className="mt-6 flex flex-col gap-8 lg:flex-row lg:items-start">
        <FilterSidebar
          basePath={basePath}
          state={state}
          categories={facetCounts.categories}
          brands={facetCounts.brands}
          showCategoryFacet={false}
          showRatingFacet={hasReviews}
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-4">
            <FilterChips basePath={basePath} state={state} categories={facetCounts.categories} />
            <SortBar
              basePath={basePath}
              state={state}
              resultCount={products.length}
              totalCount={totalCount}
              showHighestRated={hasReviews}
            />
          </div>
          <div className="mt-6">
            <ProductGrid products={products} />
          </div>
        </div>
      </div>
    </div>
  );
}
