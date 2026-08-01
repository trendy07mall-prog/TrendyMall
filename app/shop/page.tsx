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
import { ShopTrustStrip } from "@/components/product/ShopTrustStrip";
import { ViewToggle } from "@/components/product/ViewToggle";
import { Breadcrumbs } from "@/components/product/Breadcrumbs";
import { Pagination } from "@/components/product/Pagination";
import { ViewModeProvider } from "@/context/ViewModeContext";

export const metadata: Metadata = {
  title: "Shop All Accessories",
  description:
    "Browse the full TrendyMall catalogue of mobile phone accessories — earbuds, speakers, power banks, and headphones.",
  // Static, not per-filter — every filter/sort combination on this page
  // canonicalizes back to the clean base URL, so Google doesn't index each
  // query-param combination as a separate page.
  alternates: { canonical: "/shop" },
};

const PAGE_SIZE = 24;

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

  const totalPages = Math.max(1, Math.ceil(products.length / PAGE_SIZE));
  const requestedPage = Number(sp.page);
  const currentPage = Number.isInteger(requestedPage)
    ? Math.min(Math.max(requestedPage, 1), totalPages)
    : 1;
  const pagedProducts = products.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  return (
    <div className="mx-auto w-full max-w-[var(--container-width)] flex-1 px-6 py-[var(--section-padding-y)] max-sm:py-12">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Shop" }]} />
      <p className="mt-4 text-xs font-semibold tracking-widest text-[var(--color-text-secondary)] uppercase">
        Shop
      </p>
      <h1 className="text-h1">{state.onSale ? "Special Price Sale" : "Shop All"}</h1>
      <p className="mt-2 text-[var(--muted)]">
        {state.onSale
          ? `Showing ${products.length} product${products.length === 1 ? "" : "s"} with special pricing.`
          : "Every product we carry, in one place."}
      </p>

      <ShopTrustStrip />

      <div className="mt-8">
        <MobileFilterSortBar
          basePath="/shop"
          state={state}
          categories={facetCounts.categories}
          brands={facetCounts.brands}
          showCategoryFacet
          showRatingFacet={hasReviews}
        />
      </div>

      <ViewModeProvider>
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
                viewToggle={<ViewToggle />}
              />
            </div>
            <div className="mt-6">
              <ProductGrid
                products={pagedProducts}
                emptyMessage={
                  state.onSale
                    ? "No special offers right now — check back soon."
                    : undefined
                }
              />
            </div>
            <Pagination
              basePath="/shop"
              currentPage={currentPage}
              totalPages={totalPages}
              searchParams={sp}
            />
          </div>
        </div>
      </ViewModeProvider>
    </div>
  );
}
