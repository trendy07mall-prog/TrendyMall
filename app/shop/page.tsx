import type { Metadata } from "next";
import {
  getAllProducts,
  getFacetCounts,
  getPublishedProductCount,
  hasAnyApprovedReviews,
} from "@/lib/data/products";
import { getCategories } from "@/lib/data/categories";
import { parseProductFilterState, toProductListFilters } from "@/lib/product-filters";
import { ProductGrid } from "@/components/product/ProductGrid";
import { FilterSidebar } from "@/components/product/FilterSidebar";
import { MobileFilterSortBar } from "@/components/product/MobileFilterSortBar";
import { FilterChips } from "@/components/product/FilterChips";
import { SortBar } from "@/components/product/SortBar";

export const metadata: Metadata = {
  title: "Shop All Accessories",
  description:
    "Browse the full TrendyMall catalogue of mobile phone accessories — earbuds, speakers, power banks, and headphones.",
};

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const state = parseProductFilterState(sp);
  const categories = await getCategories();
  const filters = toProductListFilters(state, categories);

  const [products, totalCount, facetCounts, hasReviews] = await Promise.all([
    getAllProducts(filters),
    getPublishedProductCount(),
    getFacetCounts(filters, { includeCategoryFacet: true }),
    hasAnyApprovedReviews(),
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-12">
      <h1 className="font-heading text-3xl font-bold tracking-tight">
        Shop All
      </h1>
      <p className="mt-2 text-[var(--muted)]">
        Every product we carry, in one place.
      </p>

      <div className="mt-6">
        <MobileFilterSortBar
          basePath="/shop"
          state={state}
          categories={facetCounts.categories}
          brands={facetCounts.brands}
          showCategoryFacet
          showRatingFacet={hasReviews}
        />
      </div>

      <div className="mt-6 flex flex-col gap-8 lg:flex-row lg:items-start">
        <FilterSidebar
          basePath="/shop"
          state={state}
          categories={facetCounts.categories}
          brands={facetCounts.brands}
          showCategoryFacet
          showRatingFacet={hasReviews}
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-4">
            <FilterChips basePath="/shop" state={state} categories={facetCounts.categories} />
            <SortBar
              basePath="/shop"
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
