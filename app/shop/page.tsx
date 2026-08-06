import type { Metadata } from "next";
import {
  getAllProducts,
  getFacetCounts,
  getPublishedProductCount,
  hasAnyApprovedReviews,
} from "@/lib/data/products";
import { getCategories } from "@/lib/data/categories";
import { getBrands } from "@/lib/data/brands";
import { getTags } from "@/lib/data/tags";
import { getAllAttributeValues } from "@/lib/data/attributes";
import { parseProductFilterState, toProductListFilters } from "@/lib/product-filters";
import { ProductGrid } from "@/components/product/ProductGrid";
import { FilterSidebar } from "@/components/product/FilterSidebar";
import { MobileFilterSortBar } from "@/components/product/MobileFilterSortBar";
import { FilterChips } from "@/components/product/FilterChips";
import { SortBar } from "@/components/product/SortBar";
import { QuickFilterChips } from "@/components/product/QuickFilterChips";
import { CategoryCarousel } from "@/components/product/CategoryCarousel";
import { ViewToggle } from "@/components/product/ViewToggle";
import { Breadcrumbs } from "@/components/product/Breadcrumbs";
import { Pagination } from "@/components/product/Pagination";
import { ViewModeProvider } from "@/context/ViewModeContext";
import { ShoppingBagIcon, FolderIcon, StoreIcon, TruckIcon } from "@/components/ui/Icon";

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
  const [categories, brands, tags, attributeValues] = await Promise.all([
    getCategories(),
    getBrands(),
    getTags(),
    getAllAttributeValues(),
  ]);
  const filters = toProductListFilters(state, categories, brands, tags, attributeValues);

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
      <div className="min-h-[140px] rounded-[20px] border border-[var(--border)] bg-[var(--color-card)] px-8 py-10">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Shop" }]} />
        <p className="mt-4 text-xs font-semibold tracking-widest text-[var(--color-text-secondary)] uppercase">
          Shop
        </p>
        <h1 className="text-[42px] font-bold uppercase">
          {state.onSale ? "Special Price Sale" : "Shop All"}
        </h1>
        <p className="mt-2 text-[15px] text-[var(--muted)]">
          {state.onSale
            ? `Showing ${products.length} product${products.length === 1 ? "" : "s"} with special pricing.`
            : "Every product we carry, in one place."}
        </p>
      </div>

      {/* Live counts only -- no fabricated stats like a review-score
          percentage we have no aggregate data to support. "Categories"
          deliberately counts only categories with at least one product
          (facetCounts.categories, filtered) rather than every active row in
          the categories table -- that table carries a much larger taxonomy
          than what the 15-product catalog actually uses (21 active rows vs
          7 actually populated), and "categories we carry" should reflect
          the latter. Brands has no such gap (11 active = 11 actually used),
          confirmed directly against the live data, so brands.length is
          already correct as-is. Products from the same
          getPublishedProductCount() the toolbar's own count is built from. */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { icon: ShoppingBagIcon, value: String(totalCount), label: "Products" },
          {
            icon: FolderIcon,
            value: String(facetCounts.categories.filter((c) => c.count > 0).length),
            label: "Categories",
          },
          { icon: StoreIcon, value: String(brands.length), label: "Brands" },
          { icon: TruckIcon, value: "Islandwide", label: "Delivery" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col items-center gap-1.5 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--color-card)] px-3 py-4 text-center"
          >
            <stat.icon className="h-6 w-6 text-[var(--color-warning)]" />
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-[13px] text-[var(--color-text-secondary)]">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <QuickFilterChips basePath="/shop" state={state} />
      </div>

      <div className="mt-3">
        <CategoryCarousel
          basePath="/shop"
          state={state}
          categories={categories}
          counts={facetCounts.categories}
        />
      </div>

      <div className="mt-6">
        <MobileFilterSortBar
          basePath="/shop"
          state={state}
          categories={facetCounts.categories}
          brands={facetCounts.brands}
          tags={facetCounts.tags}
          attributes={facetCounts.attributes}
          showCategoryFacet
          showRatingFacet={hasReviews}
          variant="shop"
        />
      </div>

      <ViewModeProvider>
        <div className="mt-6 flex flex-col gap-8 lg:flex-row lg:items-start">
          <FilterSidebar
            basePath="/shop"
            state={state}
            categories={facetCounts.categories}
            brands={facetCounts.brands}
            tags={facetCounts.tags}
            attributes={facetCounts.attributes}
            showCategoryFacet
            showRatingFacet={hasReviews}
            variant="shop"
          />

          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-4">
              <FilterChips
                basePath="/shop"
                state={state}
                categories={facetCounts.categories}
                tags={facetCounts.tags}
                attributes={facetCounts.attributes}
              />
              <SortBar
                basePath="/shop"
                state={state}
                resultCount={products.length}
                totalCount={totalCount}
                showHighestRated={hasReviews}
                viewToggle={<ViewToggle />}
                variant="shop"
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
                variant="shop"
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
