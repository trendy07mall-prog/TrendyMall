import { cache } from "react";
import { unstable_cache } from "next/cache";
import { CACHE_TAGS, CACHE_TTL } from "@/lib/cache-tags";
import { runInPublicScope } from "@/lib/supabase/public-scope";
import { getCategories } from "@/lib/data/categories";
import { getGeneralSettings, getBrandingSettings } from "@/lib/data/settings";
import {
  getNewArrivals,
  getProductsByIds,
  getAllProducts,
  getProductDetailBySlug,
  getFacetCounts,
  getPublishedProductCount,
  hasAnyApprovedReviews,
} from "@/lib/data/products";
import { getBrands } from "@/lib/data/brands";
import { getTags } from "@/lib/data/tags";
import { getAllAttributeValues } from "@/lib/data/attributes";
import {
  getHomepageCampaigns,
  getShopCampaigns,
  getCampaignSections,
  getCampaignSoldCounts,
  getCampaignFeaturedDisplayByProduct,
} from "@/lib/data/campaigns";
import { createPublicClient } from "@/lib/supabase/public-client";
import type { Campaign, Category, ProductWithPrimaryImage, Brand, Tag, AttributeValue } from "@/types";
import type { ProductDetail } from "@/lib/data/products";
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

export const getCachedPublishedProductCount = (): Promise<number> =>
  unstable_cache(() => runInPublicScope(() => getPublishedProductCount()), ["published-count"], {
    revalidate: CACHE_TTL.products,
    tags: [CACHE_TAGS.products],
  })();

export const getCachedHasAnyApprovedReviews = (): Promise<boolean> =>
  unstable_cache(() => runInPublicScope(() => hasAnyApprovedReviews()), ["has-reviews"], {
    revalidate: CACHE_TTL.products,
    tags: [CACHE_TAGS.products],
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
