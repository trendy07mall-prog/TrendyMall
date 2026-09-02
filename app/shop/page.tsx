import type { Metadata } from "next";
import {
  getAllProducts,
  getFacetCounts,
  getPublishedProductCount,
  getSearchMatchIds,
  hasAnyApprovedReviews,
  searchProducts,
} from "@/lib/data/products";
import { getCategories } from "@/lib/data/categories";
import { getBrands } from "@/lib/data/brands";
import { getTags } from "@/lib/data/tags";
import { getAllAttributeValues } from "@/lib/data/attributes";
import { getShopCampaigns } from "@/lib/data/campaigns";
import { parseProductFilterState, toProductListFilters } from "@/lib/product-filters";
import { CampaignBannerCarousel } from "@/components/marketing/CampaignBannerCarousel";
import { ProductGrid } from "@/components/product/ProductGrid";
import { FilterSidebar } from "@/components/product/FilterSidebar";
import { MobileFilterSortBar } from "@/components/product/MobileFilterSortBar";
import { FilterChips } from "@/components/product/FilterChips";
import { SortBar } from "@/components/product/SortBar";
import { QuickFilterChips } from "@/components/product/QuickFilterChips";
import { CategoryCarousel } from "@/components/product/CategoryCarousel";
import { BrandStrip } from "@/components/product/BrandStrip";
import { ShopQuickJumpNav } from "@/components/product/ShopQuickJumpNav";
import { ShopSearchInput } from "@/components/product/ShopSearchInput";
import { ViewToggle } from "@/components/product/ViewToggle";
import { Breadcrumbs } from "@/components/product/Breadcrumbs";
import { Pagination } from "@/components/product/Pagination";
import { ViewModeProvider } from "@/context/ViewModeContext";

export const metadata: Metadata = {
  title: "Shop All Accessories",
  description:
    "Browse the full TrendyMall catalogue of mobile phone accessories — earbuds, speakers, power banks, and headphones.",
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
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const extraQuery = q ? { q } : undefined;

  const [categories, brands, tags, attributeValues] = await Promise.all([
    getCategories(),
    getBrands(),
    getTags(),
    getAllAttributeValues(),
  ]);
  const filters = toProductListFilters(state, categories, brands, tags, attributeValues);

  // Search-within-results reuses /search's exact matching mechanism
  // (getSearchMatchIds/searchProducts + getFacetCounts's restrictToIds) --
  // no new filter/search logic, just the same functions invoked from a
  // second page. Without a `q`, every query below runs exactly as it did
  // before this redesign.
  const matchIds = q ? await getSearchMatchIds(q) : null;

  const [products, totalCount, facetCounts, hasReviews, shopCampaigns] = await Promise.all([
    matchIds ? searchProducts(q, filters) : getAllProducts(filters),
    getPublishedProductCount(),
    getFacetCounts(filters, {
      includeCategoryFacet: true,
      ...(matchIds ? { restrictToIds: matchIds } : {}),
    }),
    hasAnyApprovedReviews(),
    getShopCampaigns(),
  ]);

  const hasActiveCampaign = shopCampaigns.length > 0;

  const totalPages = Math.max(1, Math.ceil(products.length / PAGE_SIZE));
  const requestedPage = Number(sp.page);
  const currentPage = Number.isInteger(requestedPage)
    ? Math.min(Math.max(requestedPage, 1), totalPages)
    : 1;
  // getAllProducts/searchProducts (via applyPostFilters, lib/data/products.ts)
  // already applies the campaign-context price/badge correction to the
  // WHOLE filtered result set -- before sorting and before this pagination
  // slice -- whenever state.campaign is set, so `products` here is already
  // correctly priced/sorted/badged for the Flash Sale filtered view. No
  // second pass needed here.
  const pagedProducts = products.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  return (
    <div className="mx-auto w-full max-w-[var(--container-width)] flex-1 px-6 py-[var(--section-padding-y)] max-sm:py-12">
      {/* Hero/header section (eyebrow label, "Shop All" heading, subtitle,
          and the 4-stat strip) removed per request -- breadcrumb now flows
          directly into the campaign banner/filters/grid below. */}
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Shop" }]} />

      <div className="mt-6">
        <CampaignBannerCarousel campaigns={shopCampaigns} />
      </div>

      <ShopQuickJumpNav state={state} hasActiveCampaign={hasActiveCampaign} extraQuery={extraQuery} />

      <div className="mt-6">
        <QuickFilterChips
          basePath="/shop"
          state={state}
          extraQuery={extraQuery}
          showCampaignChip={hasActiveCampaign}
        />
      </div>

      <div className="mt-6">
        <CategoryCarousel
          basePath="/shop"
          state={state}
          categories={categories}
          counts={facetCounts.categories}
          extraQuery={extraQuery}
        />
      </div>

      <div className="mt-4">
        <BrandStrip basePath="/shop" state={state} brands={facetCounts.brands} extraQuery={extraQuery} />
      </div>

      <div className="mt-8">
        <MobileFilterSortBar
          basePath="/shop"
          state={state}
          categories={facetCounts.categories}
          brands={facetCounts.brands}
          tags={facetCounts.tags}
          attributes={facetCounts.attributes}
          showCategoryFacet
          showRatingFacet={hasReviews}
          extraQuery={extraQuery}
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
            extraQuery={extraQuery}
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
                extraQuery={extraQuery}
                variant="shop"
              />
              <SortBar
                basePath="/shop"
                state={state}
                resultCount={products.length}
                totalCount={matchIds ? matchIds.length : totalCount}
                showHighestRated={hasReviews}
                extraQuery={extraQuery}
                viewToggle={<ViewToggle />}
                searchInput={<ShopSearchInput basePath="/shop" state={state} initialQuery={q} />}
                variant="shop"
              />
            </div>
            <div className="mt-6">
              <ProductGrid
                products={pagedProducts}
                emptyMessage={
                  q
                    ? `No products found for "${q}".`
                    : state.onSale
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
