import type { MetadataRoute } from "next";
import { getCategories, getCategorySlugsWithProducts } from "@/lib/data/categories";
import { getAllProductSlugs } from "@/lib/data/products";
import { getAllCampaignSlugs } from "@/lib/data/campaigns";
import { getPolicyLastUpdated } from "@/lib/data/settings";
import { SITE_URL as siteUrl } from "@/lib/site";

// Genuinely static, code-driven pages -- no CMS row backs any of these, so
// there's no real "last modified" to report. lastModified is optional on a
// sitemap entry; omitting it here is more honest than either a shared
// build-time `new Date()` (implies the whole site changed on every deploy)
// or a fabricated date. Same "omit rather than fake it" call this app
// already makes for a policy page with no store_settings row yet -- see
// LegalPageLayout's lastUpdated handling.
const STATIC_ROUTES = [
  "",
  "/shop",
  "/new-arrivals",
  "/combo-deals",
  "/brands",
  "/coupons",
  "/about",
  "/contact",
  "/faq",
  "/track-order",
];

// These five DO have a real per-page timestamp: each is a distinct
// store_settings row (policies.*_body) with its own updated_at, already
// surfaced on /privacy and /terms via getPolicyLastUpdated -- reused here
// rather than re-deriving it, and now applied to all five policy pages
// (not just the two that currently render a "Last updated" label).
const POLICY_ROUTES: { path: string; settingsKey: string }[] = [
  { path: "/shipping", settingsKey: "policies.shipping_body" },
  { path: "/returns", settingsKey: "policies.returns_body" },
  { path: "/warranty", settingsKey: "policies.warranty_body" },
  { path: "/privacy", settingsKey: "policies.privacy_body" },
  { path: "/terms", settingsKey: "policies.terms_body" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, categorySlugsWithProducts, products, campaigns, policyDates] = await Promise.all([
    getCategories(),
    getCategorySlugsWithProducts(),
    getAllProductSlugs(),
    getAllCampaignSlugs(),
    Promise.all(POLICY_ROUTES.map((r) => getPolicyLastUpdated(r.settingsKey))),
  ]);

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((path) => ({
    url: `${siteUrl}${path}`,
  }));

  const policyEntries: MetadataRoute.Sitemap = POLICY_ROUTES.map((route, i) => {
    const updatedAt = policyDates[i];
    return {
      url: `${siteUrl}${route.path}`,
      ...(updatedAt ? { lastModified: new Date(updatedAt) } : {}),
    };
  });

  // categories has no updated_at column (confirmed against the live
  // schema) -- created_at is the closest real signal available, still far
  // more accurate than a shared build timestamp for a table that's edited
  // rarely after creation.
  // Categories with no products anywhere in their subtree are left out.
  // A sitemap is a list of pages worth indexing, and an empty category
  // page is the definition of thin content -- four of the 23 are empty
  // today. They stay live and browsable; they are simply not advertised
  // to Google, and they return automatically once stocked, because this
  // is derived from real product counts rather than a hardcoded list.
  const categoryEntries: MetadataRoute.Sitemap = categories
    .filter((category) => categorySlugsWithProducts.has(category.slug))
    .map((category) => ({
      url: `${siteUrl}/category/${category.slug}`,
      lastModified: new Date(category.created_at),
    }));

  const productEntries: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${siteUrl}/product/${product.slug}`,
    lastModified: new Date(product.updatedAt),
  }));

  const campaignEntries: MetadataRoute.Sitemap = campaigns.map((campaign) => ({
    url: `${siteUrl}/campaign/${campaign.slug}`,
    lastModified: new Date(campaign.updatedAt),
  }));

  return [...staticEntries, ...policyEntries, ...categoryEntries, ...productEntries, ...campaignEntries];
}
