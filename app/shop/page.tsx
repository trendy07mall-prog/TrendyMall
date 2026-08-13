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
import { ShopStatStrip } from "@/components/product/ShopStatStrip";
import { ShopQuickJumpNav } from "@/components/product/ShopQuickJumpNav";
import { ShopSearchInput } from "@/components/product/ShopSearchInput";
import { ViewToggle } from "@/components/product/ViewToggle";
import { Breadcrumbs } from "@/components/product/Breadcrumbs";
import { Pagination } from "@/components/product/Pagination";
import { ViewModeProvider } from "@/context/ViewModeContext";
import { ShoppingBagIcon, FolderIcon, StoreIcon, TruckIcon } from "@/components/ui/Icon";

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
  const pagedProducts = products.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  return (
    <div className="mx-auto w-full max-w-[var(--container-width)] flex-1 px-6 py-[var(--section-padding-y)] max-sm:py-12">
      {/* Hero sits directly on the page background -- no card container. */}
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
      <div className="mt-8">
        <ShopStatStrip
          stats={[
            { icon: ShoppingBagIcon, value: String(totalCount), label: "Products" },
            {
              icon: FolderIcon,
              value: String(facetCounts.categories.filter((c) => c.count > 0).length),
              label: "Categories",
            },
            { icon: StoreIcon, value: String(brands.length), label: "Brands" },
            { icon: TruckIcon, value: "Islandwide", label: "Delivery" },
          ]}
        />
      </div>

      <div className="mt-8">
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
