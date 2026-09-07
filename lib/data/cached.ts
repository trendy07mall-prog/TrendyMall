import { unstable_cache } from "next/cache";
import { CACHE_TAGS, CACHE_TTL } from "@/lib/cache-tags";
import { runInPublicScope } from "@/lib/supabase/public-scope";
import { getCategories } from "@/lib/data/categories";
import { getGeneralSettings, getBrandingSettings } from "@/lib/data/settings";
import { getNewArrivals, getProductsByIds } from "@/lib/data/products";
import {
  getHomepageCampaigns,
  getCampaignSections,
  getCampaignSoldCounts,
  getCampaignFeaturedDisplayByProduct,
} from "@/lib/data/campaigns";
import { createPublicClient } from "@/lib/supabase/public-client";
import type { Campaign, Category, ProductWithPrimaryImage } from "@/types";
import type { CampaignSectionData, CampaignFeaturedDisplay } from "@/lib/data/campaigns";
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

export const getCachedCategories = (depth = 0): Promise<Category[]> =>
  unstable_cache(
    () => runInPublicScope(() => getCategories({ depth, activeOnly: true })),
    ["categories", String(depth)],
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
