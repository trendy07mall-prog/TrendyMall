import type { Metadata } from "next";
import { getCategories } from "@/lib/data/categories";
import {
  getFacetCounts,
  getSearchMatchIds,
  hasAnyApprovedReviews,
  searchProducts,
} from "@/lib/data/products";
import { parseProductFilterState, toProductListFilters } from "@/lib/product-filters";
import { ProductGrid } from "@/components/product/ProductGrid";
import { FilterSidebar } from "@/components/product/FilterSidebar";
import { MobileFilterSortBar } from "@/components/product/MobileFilterSortBar";
import { FilterChips } from "@/components/product/FilterChips";
import { SortBar } from "@/components/product/SortBar";

export const metadata: Metadata = {
  title: "Search Results",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";

  if (!q) {
    return (
      <div className="mx-auto w-full max-w-[var(--container-width)] flex-1 px-6 py-12">
        <h1 className="font-heading text-2xl font-bold tracking-tight">Search</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Use the search bar above to find products, categories, or brands.
        </p>
      </div>
    );
  }

  const state = parseProductFilterState(sp);
  const categories = await getCategories();
  const filters = toProductListFilters(state, categories);
  const extraQuery = { q };

  const matchIds = await getSearchMatchIds(q);

  const [products, facetCounts, hasReviews] = await Promise.all([
    searchProducts(q, filters),
    getFacetCounts(filters, { includeCategoryFacet: true, restrictToIds: matchIds }),
    hasAnyApprovedReviews(),
  ]);

  return (
    <div className="mx-auto w-full max-w-[var(--container-width)] flex-1 px-6 py-12">
      <h1 className="font-heading text-2xl font-bold tracking-tight">
        Search results for &quot;{q}&quot;
      </h1>

      <div className="mt-6">
        <MobileFilterSortBar
          basePath="/search"
          state={state}
          categories={facetCounts.categories}
          brands={facetCounts.brands}
          showCategoryFacet
          showRatingFacet={hasReviews}
          extraQuery={extraQuery}
        />
      </div>

      <div className="mt-6 flex flex-col gap-8 lg:flex-row lg:items-start">
        <FilterSidebar
          basePath="/search"
          state={state}
          categories={facetCounts.categories}
          brands={facetCounts.brands}
          showCategoryFacet
          showRatingFacet={hasReviews}
          extraQuery={extraQuery}
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-4">
            <FilterChips
              basePath="/search"
              state={state}
              categories={facetCounts.categories}
              extraQuery={extraQuery}
            />
            <SortBar
              basePath="/search"
              state={state}
              resultCount={products.length}
              totalCount={matchIds.length}
              showHighestRated={hasReviews}
              extraQuery={extraQuery}
            />
          </div>
          <div className="mt-6">
            <ProductGrid products={products} emptyMessage="No matching products found." />
          </div>
        </div>
      </div>
    </div>
  );
}
