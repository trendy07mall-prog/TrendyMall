import { cache } from "react";
import { unstable_cache } from "next/cache";
import { CACHE_TAGS, CACHE_TTL } from "@/lib/cache-tags";
import { runInPublicScope } from "@/lib/supabase/public-scope";
import {
  getCategories,
  getCategoryAncestors,
  getCategoryById,
  getCategoryBySlug,
  getChildCategories,
  getDescendantCategoryIds,
} from "@/lib/data/categories";
import { getGeneralSettings, getBrandingSettings } from "@/lib/data/settings";
import {
  getNewArrivals,
  getProductsByIds,
  getAllProducts,
  getProductDetailBySlug,
  getProductsByBrand,
  getProductsByCategory,
  getRelatedProducts,
  getFacetCounts,
  getPublishedProductCount,
  hasAnyApprovedReviews,
} from "@/lib/data/products";
import {
  getBrands,
  getBrandBySlug,
  getBrandsAlphabetical,
  getBrandProductCounts,
  getFeaturedBrands,
} from "@/lib/data/brands";
import { getProductSpecs } from "@/lib/data/spec-templates";
import { getProductReviews, getProductRatingSummary } from "@/lib/reviews";
import { getTags, getProductTags } from "@/lib/data/tags";
import { getAllAttributeValues } from "@/lib/data/attributes";
import {
  getHomepageCampaigns,
  getShopCampaigns,
  getCampaignSections,
  getCampaignSoldCounts,
  getCampaignFeaturedDisplayByProduct,
} from "@/lib/data/campaigns";
import { createPublicClient } from "@/lib/supabase/public-client";
import type {
  Campaign,
  Category,
  ProductWithPrimaryImage,
  Brand,
  Tag,
  AttributeValue,
  ProductRatingSummary,
} from "@/types";
import type { ProductDetail } from "@/lib/data/products";
import type { DisplaySpec } from "@/lib/data/spec-templates";
import type { ReviewWithReviewerName } from "@/lib/reviews";
import type { CampaignSectionData, CampaignFeaturedDisplay } from "@/lib/data/campaigns";
import type { FacetCounts } from "@/lib/data/products";
import type { ProductListFilters } from "@/lib/product-filters";
import type { BrandingSettings, GeneralSettings } from "@/lib/data/settings";

// Cached wrappers over the storefront's PUBLIC reads. Nothing personalised
// belongs here: no session, cart, wishlist, order or admin data. The
// wrapped function runs inside runInPublicScope, so every createClient()
// beneath it -- however deeply nested -- transparently gets the
// session-less client, and the cached value is the anonymous view of the
// data, correct to share with every visitor.
//
// Invalidation is by tag (lib/cache-tags.ts), wired into the admin
// mutations that change each kind of data. The TTLs are a backstop for
// anything that changes without an admin action, not the primary mechanism.

// depth omitted = the whole active tree (/shop's sidebar); depth 0 = just
// top-level (the header and homepage carousel). The depth is part of the
// cache key, so those two shapes can never be served for one another.
export const getCachedCategories = (depth?: number): Promise<Category[]> =>
  unstable_cache(
    () =>
      runInPublicScope(() =>
        getCategories({ ...(depth != null ? { depth } : {}), activeOnly: true }),
      ),
    ["categories", depth != null ? String(depth) : "all"],
    { revalidate: CACHE_TTL.categories, tags: [CACHE_TAGS.categories] },
  )();

export const getCachedGeneralSettings = (): Promise<GeneralSettings> =>
  unstable_cache(() => runInPublicScope(() => getGeneralSettings()), ["settings", "general"], {
    revalidate: CACHE_TTL.settings,
    tags: [CACHE_TAGS.settings],
  })();

export const getCachedBrandingSettings = (): Promise<BrandingSettings> =>
  unstable_cache(() => runInPublicScope(() => getBrandingSettings()), ["settings", "branding"], {
    revalidate: CACHE_TTL.settings,
    tags: [CACHE_TAGS.settings],
  })();

export const getCachedNewArrivals = (limit = 8): Promise<ProductWithPrimaryImage[]> =>
  unstable_cache(
    () => runInPublicScope(() => getNewArrivals(limit)),
    ["new-arrivals", String(limit)],
    { revalidate: CACHE_TTL.products, tags: [CACHE_TAGS.products] },
  )();

// The product detail page's entire data payload -- product row, images,
// variants (with their images, attribute values and live campaign pricing)
// and the product's attribute groups. This is the single most expensive
// read on the storefront: four sequential query waves, re-run in full on
// every single product view.
//
// SERIALISATION: verified JSON-safe before this was added, not assumed.
// The whole payload was walked for Maps/Sets/Dates/class instances and
// deep-compared against its own JSON round trip, across products with
// attribute groups, multiple variants, and a live campaign. Every value is
// a plain JSON type -- notably campaign_end_at is already an ISO string
// (PostgREST never hands back Date objects), and the two places the
// underlying code builds a Map (getProductAttributesForDetail's grouping,
// getCampaignSoldCounts) both resolve to arrays/numbers before returning,
// so neither Map ever crosses this boundary. That check mattered: a Map
// silently becoming {} through this exact API is a bug this codebase has
// already shipped once (see getCachedCampaignSoldCounts below).
//
// 60s, NOT CACHE_TTL.products. A campaign starting or ending is purely
// time-based -- there is no admin edit at that boundary to invalidate on,
// so the TTL is the only thing bounding how long a product page can show
// pricing from the wrong side of it. Same reasoning, and same number, as
// getCachedHomepageCampaigns/getCachedShopCampaigns above.
//
// Tagged with BOTH products and campaigns: the payload mixes the two, and
// either kind of admin edit has to drop it. Every product mutation
// (including the quick-edit price/stock/status actions and the stock
// decrement in orderActions) already calls updateTag(CACHE_TAGS.products),
// and the campaign actions call updateTag(CACHE_TAGS.campaigns) -- both
// expire immediately, so a price change is visible on the next request
// rather than up to a TTL later.
//
// React's cache() on the outside dedupes within a request: the product
// page reads this twice (generateMetadata and the body), and on a cache
// miss that would otherwise be two full four-wave fetches racing.
export const getCachedProductDetailBySlug = cache(
  (slug: string): Promise<ProductDetail | null> =>
    unstable_cache(
      () => runInPublicScope(() => getProductDetailBySlug(slug)),
      ["product-detail", slug],
      { revalidate: 60, tags: [CACHE_TAGS.products, CACHE_TAGS.campaigns] },
    )(),
);

export const getCachedProductsByIds = (ids: string[]): Promise<ProductWithPrimaryImage[]> =>
  unstable_cache(
    () => runInPublicScope(() => getProductsByIds(ids)),
    // The id list IS the cache key -- a different set of products is a
    // different cached entry, not a stale hit on the previous one.
    ["products-by-ids", [...ids].sort().join(",")],
    { revalidate: CACHE_TTL.products, tags: [CACHE_TAGS.products] },
  )();

export const getCachedHomepageCampaigns = (): Promise<Campaign[]> =>
  unstable_cache(() => runInPublicScope(() => getHomepageCampaigns()), ["homepage-campaigns"], {
    // Shorter than the campaign TTL on purpose: a campaign going live or
    // ending is time-based, with no admin edit at the boundary to
    // invalidate it, so this is what bounds how late the homepage notices.
    revalidate: 60,
    tags: [CACHE_TAGS.campaigns],
  })();

export const getCachedCampaignSections = (campaigns: Campaign[]): Promise<CampaignSectionData[]> =>
  unstable_cache(
    () => runInPublicScope(() => getCampaignSections(campaigns)),
    ["campaign-sections", campaigns.map((c) => c.id).sort().join(",")],
    { revalidate: CACHE_TTL.campaigns, tags: [CACHE_TAGS.campaigns] },
  )();

// The next two return Maps, and unstable_cache stores its value as JSON --
// a Map survives that round trip as `{}`, losing both its contents and its
// .get(), which surfaces as "TypeError: x.get is not a function" at render
// time rather than as a cache error. So the cached layer deals only in
// entry arrays, and the Map is rebuilt on the way out, where callers still
// receive exactly the Map shape they always did.

export const getCachedCampaignSoldCounts = async (
  campaignIds: string[],
): Promise<Map<string, Map<string, number>>> => {
  const entries = await unstable_cache(
    () =>
      runInPublicScope(async () => {
        const map = await getCampaignSoldCounts(createPublicClient(), campaignIds);
        // Nested Maps: both levels have to be flattened, not just the outer.
        return [...map.entries()].map(([id, inner]) => [id, [...inner.entries()]] as const);
      }),
    ["campaign-sold-counts", [...campaignIds].sort().join(",")],
    { revalidate: CACHE_TTL.soldCounts, tags: [CACHE_TAGS.soldCounts] },
  )();
  return new Map(entries.map(([id, inner]) => [id, new Map(inner)]));
};

export const getCachedCampaignFeaturedDisplay = async (
  campaignId: string,
  productIds: string[],
): Promise<Map<string, CampaignFeaturedDisplay>> => {
  const entries = await unstable_cache(
    () =>
      runInPublicScope(async () => {
        const map = await getCampaignFeaturedDisplayByProduct(
          createPublicClient(),
          campaignId,
          productIds,
        );
        return [...map.entries()];
      }),
    ["campaign-featured", campaignId, [...productIds].sort().join(",")],
    { revalidate: CACHE_TTL.campaigns, tags: [CACHE_TAGS.campaigns] },
  )();
  return new Map(entries);
};


// --- /shop -------------------------------------------------------------
//
// Two groups here. The first is filter-independent: the same answer no
// matter what the visitor has selected, so it caches under a fixed key.
// The second depends on the active filters, and those go into the cache
// key -- getting that wrong would serve one filter's results under
// another's, which is a far worse failure than being slow. JSON.stringify
// of the resolved filter object is deterministic for a given shape, and
// the failure mode if two equivalent filter states serialise differently
// is only a cache miss, never a wrong hit.
//
// Free-text search is deliberately NOT cached: the key space is unbounded
// (every distinct query string is its own entry), and it's the less
// travelled path. /shop without a search term -- what most visitors and
// every crawler load -- is what this speeds up.

export const getCachedBrands = (): Promise<Brand[]> =>
  unstable_cache(() => runInPublicScope(() => getBrands()), ["brands"], {
    revalidate: CACHE_TTL.categories,
    tags: [CACHE_TAGS.categories],
  })();

export const getCachedTags = (): Promise<Tag[]> =>
  unstable_cache(() => runInPublicScope(() => getTags()), ["tags"], {
    revalidate: CACHE_TTL.categories,
    tags: [CACHE_TAGS.categories],
  })();

export const getCachedAttributeValues = (): Promise<AttributeValue[]> =>
  unstable_cache(() => runInPublicScope(() => getAllAttributeValues()), ["attribute-values"], {
    revalidate: CACHE_TTL.categories,
    tags: [CACHE_TAGS.categories],
  })();

export const getCachedShopCampaigns = (): Promise<Campaign[]> =>
  unstable_cache(() => runInPublicScope(() => getShopCampaigns()), ["shop-campaigns"], {
    // Same reasoning as the homepage's campaigns: a campaign starting or
    // ending is time-based, with no admin edit at the boundary.
    revalidate: 60,
    tags: [CACHE_TAGS.campaigns],
  })();

// categoryIds omitted = the whole catalogue (/shop's "N products" total);
// passed = that category's subtree (/category's own total). The id list is
// part of the cache key, so the two can never be served for one another.
export const getCachedPublishedProductCount = (categoryIds?: string[]): Promise<number> =>
  unstable_cache(
    () => runInPublicScope(() => getPublishedProductCount(categoryIds)),
    ["published-count", categoryIds ? [...categoryIds].sort().join(",") : "all"],
    { revalidate: CACHE_TTL.products, tags: [CACHE_TAGS.products] },
  )();

export const getCachedHasAnyApprovedReviews = (): Promise<boolean> =>
  unstable_cache(() => runInPublicScope(() => hasAnyApprovedReviews()), ["has-reviews"], {
    revalidate: CACHE_TTL.products,
    // Also the reviews tag now that one exists: the first approved review
    // in the store is what flips this, and that is a review moderation
    // event, not a product edit. The products tag stays so nothing that
    // used to drop this entry stops doing so.
    tags: [CACHE_TAGS.products, CACHE_TAGS.reviews],
  })();

export const getCachedAllProducts = (
  filters: ProductListFilters,
): Promise<ProductWithPrimaryImage[]> =>
  unstable_cache(
    () => runInPublicScope(() => getAllProducts(filters)),
    ["all-products", JSON.stringify(filters)],
    { revalidate: CACHE_TTL.products, tags: [CACHE_TAGS.products] },
  )();

export const getCachedFacetCounts = (
  filters: ProductListFilters,
  options: { categoryIds?: string[]; includeCategoryFacet?: boolean; restrictToIds?: string[] },
): Promise<FacetCounts> =>
  unstable_cache(
    () => runInPublicScope(() => getFacetCounts(filters, options)),
    ["facet-counts", JSON.stringify(filters), JSON.stringify(options)],
    { revalidate: CACHE_TTL.products, tags: [CACHE_TAGS.products] },
  )();


// --- /category/[...slug] ------------------------------------------------
//
// Same treatment /shop already had, applied to the route that had none:
// every read below was previously live on every single click, which is
// what made a category click sit on its skeleton for well over a second
// (each Supabase round trip from a cold client costs ~200ms, and the page
// chained four waves of them). Nothing here is personalised -- a category,
// its children, its descendant ids and its product grid are the same for
// every visitor -- so all of it caches under the existing tags, with the
// same TTLs /shop's equivalents already use.

// Not activeOnly: the page itself decides what an inactive category means
// (404, or a redirect to its replacement slug), so this has to be able to
// return one. cache() on the outside dedupes generateMetadata's lookup
// against the page body's, exactly as getCachedProductDetailBySlug does.
export const getCachedCategoryBySlug = cache(
  (slug: string): Promise<Category | null> =>
    unstable_cache(
      () => runInPublicScope(() => getCategoryBySlug(slug)),
      ["category-by-slug", slug],
      { revalidate: CACHE_TTL.categories, tags: [CACHE_TAGS.categories] },
    )(),
);

// Keyed on the materialized path, not the id: the path IS the subtree
// this resolves, so a category moved to a new parent gets a different key
// rather than a stale hit on its old subtree.
export const getCachedDescendantCategoryIds = (category: Category): Promise<string[]> =>
  unstable_cache(
    () => runInPublicScope(() => getDescendantCategoryIds(category)),
    ["descendant-category-ids", category.path],
    { revalidate: CACHE_TTL.categories, tags: [CACHE_TAGS.categories] },
  )();

export const getCachedChildCategories = (parentId: string): Promise<Category[]> =>
  unstable_cache(
    () => runInPublicScope(() => getChildCategories(parentId)),
    ["child-categories", parentId],
    { revalidate: CACHE_TTL.categories, tags: [CACHE_TAGS.categories] },
  )();

// The product page's breadcrumb trail and category name, as one entry.
// Both derive from a single category id and neither is personalised; they
// were two SEQUENTIAL round trips on the PDP's critical path (the ancestor
// query needs the category's path, which the first one returns), so a
// cache miss still costs two waves but only once per TTL instead of once
// per product view. Deliberately NOT derived from getCachedCategories():
// that list is active-only, and a product whose category was deactivated
// must keep showing the same name and breadcrumbs it shows today.
export const getCachedCategoryWithAncestors = (
  categoryId: string,
): Promise<{ category: Category | null; ancestors: Category[] }> =>
  unstable_cache(
    () =>
      runInPublicScope(async () => {
        const category = await getCategoryById(categoryId);
        if (!category) return { category: null, ancestors: [] };
        return { category, ancestors: await getCategoryAncestors(category) };
      }),
    ["category-with-ancestors", categoryId],
    { revalidate: CACHE_TTL.categories, tags: [CACHE_TAGS.categories] },
  )();

// The category page's product grid -- the single most expensive read on
// that route (~900ms measured, three internal waves). Same cache key
// discipline as getCachedAllProducts: the resolved filters are part of the
// key, so one filter state can never be served under another's, and the
// descendant id list is too, so two categories never share an entry.
//
// Stock and price accuracy: identical policy to /shop's grid, which has
// used it since it was added -- CACHE_TTL.products (5 min) as a backstop,
// and the `products` tag, which every product mutation and the stock
// decrement in orderActions already call updateTag on. So an admin price
// or stock edit, and a sale that changes stock, both show up on the next
// request rather than up to a TTL later. Checkout still re-validates stock
// server-side (fetchValidatedServerCart), so this window can never
// oversell -- it is a display window only.
export const getCachedProductsByCategory = (
  categoryIds: string[],
  filters: ProductListFilters,
): Promise<ProductWithPrimaryImage[]> =>
  unstable_cache(
    () => runInPublicScope(() => getProductsByCategory(categoryIds, filters)),
    ["products-by-category", [...categoryIds].sort().join(","), JSON.stringify(filters)],
    { revalidate: CACHE_TTL.products, tags: [CACHE_TAGS.products] },
  )();

// --- /product/[slug] ---------------------------------------------------
//
// The detail payload itself was already cached; everything AROUND it was
// not, and that surrounding work was most of the page's cost. None of it
// is personalised (hasUserReviewed is the one that is, and it stays live).

export const getCachedRelatedProducts = (
  categoryId: string,
  excludeProductId: string,
): Promise<ProductWithPrimaryImage[]> =>
  unstable_cache(
    () => runInPublicScope(() => getRelatedProducts(categoryId, excludeProductId)),
    ["related-products", categoryId, excludeProductId],
    { revalidate: CACHE_TTL.products, tags: [CACHE_TAGS.products] },
  )();

export const getCachedProductTags = (
  productId: string,
): Promise<{ name: string; slug: string }[]> =>
  unstable_cache(
    () => runInPublicScope(() => getProductTags(productId)),
    ["product-tags", productId],
    { revalidate: CACHE_TTL.products, tags: [CACHE_TAGS.products] },
  )();

// Two sequential round trips inside (the category's template, then the
// product's saved values), which is why it measured ~540ms uncached.
// Takes the ids rather than the Product object so the cache key is the
// two things the answer actually depends on.
export const getCachedProductSpecs = (
  productId: string,
  categoryId: string,
): Promise<DisplaySpec[]> =>
  unstable_cache(
    () =>
      runInPublicScope(() =>
        getProductSpecs({ id: productId, category_id: categoryId }),
      ),
    ["product-specs", productId, categoryId],
    { revalidate: CACHE_TTL.products, tags: [CACHE_TAGS.products] },
  )();

// Reviews get their own tag, not `products`: what changes them is a
// customer submitting one or an admin approving/rejecting/deleting one,
// none of which is a product edit. All three of those now call
// updateTag(CACHE_TAGS.reviews), so an approval is visible on the next
// request. Only APPROVED reviews are ever returned here, so a visitor can
// never be shown a review that has since been taken down for longer than
// that; and "have I already reviewed this?" (hasUserReviewed) is
// per-visitor and deliberately stays uncached.
export const getCachedProductReviews = (
  productId: string,
): Promise<ReviewWithReviewerName[]> =>
  unstable_cache(
    () => runInPublicScope(() => getProductReviews(productId)),
    ["product-reviews", productId],
    { revalidate: CACHE_TTL.reviews, tags: [CACHE_TAGS.reviews] },
  )();

export const getCachedProductRatingSummary = (
  productId: string,
): Promise<ProductRatingSummary | null> =>
  unstable_cache(
    () => runInPublicScope(() => getProductRatingSummary(productId)),
    ["product-rating-summary", productId],
    { revalidate: CACHE_TTL.reviews, tags: [CACHE_TAGS.reviews] },
  )();


// --- "Shop by Brand" ----------------------------------------------------
//
// Brands are near-static store configuration that only an admin edit
// changes, so they sit under the categories tag/TTL alongside brands'
// existing cached reader above -- every brand mutation in lib/admin/brands.ts
// already revalidates, and updateTag(CACHE_TAGS.categories) drops these the
// same way it drops getCachedBrands.
//
// Deliberately NOT `export const revalidate = 3600` on the brand route.
// The grid on a brand page shows live prices and stock, and an ISR page
// would hold them for an hour AND ignore updateTag entirely -- so an admin
// price edit would be invisible there while every other grid on the site
// picked it up within five minutes. These wrappers put the brand page on
// exactly the same footing as /shop and /category instead.

export const getCachedFeaturedBrands = (): Promise<Brand[]> =>
  unstable_cache(() => runInPublicScope(() => getFeaturedBrands()), ["brands", "featured"], {
    revalidate: CACHE_TTL.categories,
    tags: [CACHE_TAGS.categories],
  })();

export const getCachedBrandsAlphabetical = (): Promise<Brand[]> =>
  unstable_cache(() => runInPublicScope(() => getBrandsAlphabetical()), ["brands", "alphabetical"], {
    revalidate: CACHE_TTL.categories,
    tags: [CACHE_TAGS.categories],
  })();

// cache() on the outside so generateMetadata and the page body share one
// lookup, the same way getCachedProductDetailBySlug does.
export const getCachedBrandBySlug = cache(
  (slug: string): Promise<Brand | null> =>
    unstable_cache(() => runInPublicScope(() => getBrandBySlug(slug)), ["brand-by-slug", slug], {
      revalidate: CACHE_TTL.categories,
      tags: [CACHE_TAGS.categories],
    })(),
);

// Counts move with the catalogue, not with brand edits, so this one is
// tagged products -- every product mutation already drops it. Also cache()d
// per request: the homepage grid and a brand page's metadata both read it.
export const getCachedBrandProductCounts = cache(
  (): Promise<Record<string, number>> =>
    unstable_cache(() => runInPublicScope(() => getBrandProductCounts()), ["brand-product-counts"], {
      revalidate: CACHE_TTL.products,
      tags: [CACHE_TAGS.products],
    })(),
);

// Same cache-key discipline and the same staleness policy as
// getCachedProductsByCategory: the resolved filters are part of the key, and
// the products tag plus a 5-minute backstop means an admin price or stock
// edit, and a sale that moves stock, both show up on the next request.
export const getCachedProductsByBrand = (
  brandId: string,
  filters: ProductListFilters,
): Promise<ProductWithPrimaryImage[]> =>
  unstable_cache(
    () => runInPublicScope(() => getProductsByBrand(brandId, filters)),
    ["products-by-brand", brandId, JSON.stringify(filters)],
    { revalidate: CACHE_TTL.products, tags: [CACHE_TAGS.products] },
  )();
