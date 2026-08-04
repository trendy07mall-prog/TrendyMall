import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import {
  getCategories,
  getCategoryAncestors,
  getCategoryBySlug,
  getCategorySlugRedirect,
  getChildCategories,
  getDescendantCategoryIds,
} from "@/lib/data/categories";
import { getBrands } from "@/lib/data/brands";
import { getTags } from "@/lib/data/tags";
import { getAllAttributeValues } from "@/lib/data/attributes";
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
import { CategoryCard } from "@/components/marketing/CategoryCard";

// The URL can carry the full ancestor path (/category/electronics/audio/
// wireless-earbuds) or just the leaf slug (/category/wireless-earbuds) --
// only the LAST segment is authoritative for lookup, since categories.slug
// is still globally unique. This is what keeps every pre-hierarchy URL
// (single segment) resolving unchanged.
function leafSlug(slug: string[]): string {
  return slug[slug.length - 1];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(leafSlug(slug));
  if (!category || !category.is_active) return { title: "Category not found" };

  const title = `${category.name} Accessories`;
  const description =
    category.description ??
    `Shop ${category.name.toLowerCase()} accessories at TrendyMall.`;
  const image = category.image_path;

  return {
    title,
    description,
    alternates: {
      canonical: `/category/${category.slug}`,
    },
    openGraph: {
      title: `${title} | TrendyMall`,
      description,
      url: `/category/${category.slug}`,
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | TrendyMall`,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const requestedSlug = leafSlug(slug);
  const category = await getCategoryBySlug(requestedSlug);

  if (!category || !category.is_active) {
    const redirectSlug = await getCategorySlugRedirect(requestedSlug);
    if (redirectSlug) permanentRedirect(`/category/${redirectSlug}`);
    notFound();
  }

  const sp = await searchParams;
  const state = parseProductFilterState(sp);
  const [allCategories, allBrands, allTags, allAttributeValues] = await Promise.all([
    getCategories(),
    getBrands(),
    getTags(),
    getAllAttributeValues(),
  ]);
  const filters = toProductListFilters(state, allCategories, allBrands, allTags, allAttributeValues);
  const basePath = `/category/${category.slug}`;

  const [categoryIds, childCategories, ancestors, hasReviews] = await Promise.all([
    getDescendantCategoryIds(category),
    getChildCategories(category.id),
    getCategoryAncestors(category),
    hasAnyApprovedReviews(),
  ]);

  const [products, totalCount, facetCounts] = await Promise.all([
    getProductsByCategory(categoryIds, filters),
    getPublishedProductCount(categoryIds),
    getFacetCounts(filters, { categoryIds, includeCategoryFacet: false }),
  ]);

  return (
    <div className="mx-auto w-full max-w-[var(--container-width)] flex-1 px-6 py-12">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          ...ancestors.map((ancestor, index) => ({
            label: ancestor.name,
            href: index < ancestors.length - 1 ? `/category/${ancestor.slug}` : undefined,
          })),
        ]}
      />
      <h1 className="font-heading mt-4 text-2xl font-bold tracking-tight">
        {category.name}
      </h1>
      {category.description && (
        <p className="mt-2 text-[var(--muted)]">{category.description}</p>
      )}

      {childCategories.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {childCategories.map((child) => (
            <CategoryCard key={child.id} category={child} />
          ))}
        </div>
      )}

      <div className="mt-6">
        <MobileFilterSortBar
          basePath={basePath}
          state={state}
          categories={facetCounts.categories}
          brands={facetCounts.brands}
          tags={facetCounts.tags}
          attributes={facetCounts.attributes}
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
          tags={facetCounts.tags}
          attributes={facetCounts.attributes}
          showCategoryFacet={false}
          showRatingFacet={hasReviews}
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-4">
            <FilterChips
              basePath={basePath}
              state={state}
              categories={facetCounts.categories}
              tags={facetCounts.tags}
              attributes={facetCounts.attributes}
            />
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
