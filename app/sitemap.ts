import type { MetadataRoute } from "next";
import { getCategories } from "@/lib/data/categories";
import { getAllProductSlugs } from "@/lib/data/products";
import { getAllCampaignSlugs } from "@/lib/data/campaigns";
import { SITE_URL as siteUrl } from "@/lib/site";

const STATIC_ROUTES = [
  "",
  "/shop",
  "/new-arrivals",
  "/about",
  "/contact",
  "/shipping",
  "/returns",
  "/warranty",
  "/faq",
  "/privacy",
  "/terms",
  "/track-order",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, productSlugs, campaignSlugs] = await Promise.all([
    getCategories(),
    getAllProductSlugs(),
    getAllCampaignSlugs(),
  ]);

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: new Date(),
  }));

  const categoryEntries: MetadataRoute.Sitemap = categories.map((category) => ({
    url: `${siteUrl}/category/${category.slug}`,
    lastModified: new Date(),
  }));

  const productEntries: MetadataRoute.Sitemap = productSlugs.map((slug) => ({
    url: `${siteUrl}/product/${slug}`,
    lastModified: new Date(),
  }));

  const campaignEntries: MetadataRoute.Sitemap = campaignSlugs.map((slug) => ({
    url: `${siteUrl}/campaign/${slug}`,
    lastModified: new Date(),
  }));

  return [...staticEntries, ...categoryEntries, ...productEntries, ...campaignEntries];
}
