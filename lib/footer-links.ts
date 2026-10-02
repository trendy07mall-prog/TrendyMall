import type { Campaign } from "@/types";
import { NOINDEX_CATEGORY_SLUGS } from "@/lib/seo";

// What the site-wide footer's category row links to.
//
// Why this exists at all: the header's category menu is a client
// component whose links only exist after a click, so they are not in the
// HTML a crawler receives. Before this row, /shop, /new-arrivals, every
// product page and every policy page contained ZERO crawlable links to
// the categories that hold stock -- Google could only reach them through
// sitemap.xml. This row puts a real <a href> to each one on every page.

/**
 * The seven categories worth linking, in the order they appear, with the
 * label a shopper understands rather than the raw category name
 * ("Headphones", not "Headsets/Headphones").
 *
 * Curated rather than generated, because the ORDER is editorial — best
 * sellers first — and because three of the names read badly as link text.
 * The list is then validated against the database (see
 * `resolveFooterCategories`), so curation decides wording and order while
 * the database decides what actually appears.
 */
const FOOTER_CATEGORIES: { slug: string; label: string }[] = [
  { slug: "earbuds", label: "Earbuds" },
  { slug: "headsets-headphones", label: "Headphones" },
  { slug: "earphones", label: "Earphones" },
  { slug: "portable-speakers", label: "Bluetooth Speakers" },
  { slug: "power-bank", label: "Power Banks" },
  { slug: "trimmers-groomers-clippers", label: "Hair Trimmers & Clippers" },
  { slug: "electronic", label: "Electronics & Audio" },
];

export interface FooterLink {
  href: string;
  label: string;
}

/**
 * Filters the curated list down to categories that should really be
 * linked, against live data. Four conditions, each of which has a reason:
 *
 *   * EXISTS and is ACTIVE -- a deactivated or deleted category would
 *     otherwise become a dead link on all ~35 pages at once.
 *   * NOT noindexed -- pointing site-wide links at a page we have told
 *     Google to ignore wastes the link and contradicts the signal.
 *   * HAS PRODUCTS -- an empty category page is thin content; sending
 *     every page's links into one is worse than not linking it.
 *
 * `slugsWithProducts` counts descendants, so a parent whose stock sits in
 * its children still qualifies.
 */
export function resolveFooterCategories(
  categories: { slug: string; is_active: boolean }[],
  slugsWithProducts: Iterable<string>,
): FooterLink[] {
  // Both inputs are tolerated rather than trusted. They arrive from
  // unstable_cache, which persists across deploys and serialises to JSON,
  // so a cache entry written by an older build can come back the wrong
  // shape entirely. The footer is in the root layout: a throw here takes
  // out every page on the site, which is precisely what happened once
  // while this was being built. Degrading to "no link row" is survivable;
  // a site-wide 500 is not.
  const stocked = new Set(isIterable(slugsWithProducts) ? slugsWithProducts : []);
  const live = new Map(
    (Array.isArray(categories) ? categories : []).filter((c) => c?.is_active).map((c) => [c.slug, c]),
  );

  return FOOTER_CATEGORIES.filter(
    ({ slug }) => live.has(slug) && !NOINDEX_CATEGORY_SLUGS.has(slug) && stocked.has(slug),
  ).map(({ slug, label }) => ({ href: `/category/${slug}`, label }));
}

function isIterable(value: unknown): value is Iterable<string> {
  return value != null && typeof (value as Iterable<string>)[Symbol.iterator] === "function";
}

/**
 * The "Shop" row: fixed destinations, plus the current campaign when
 * there is one.
 *
 * The campaign link is built from live data and simply absent when
 * nothing is running — never hardcoded. The Big Bang Flash Sale ends on
 * 9 Oct 2026, and a hardcoded link would turn into a 404 on every page of
 * the site the moment it did.
 *
 * Only the soonest-ending campaign is linked when several run at once:
 * this is one slim row, not a campaign index.
 */
export function resolveFooterShopLinks(activeCampaigns: Campaign[]): FooterLink[] {
  const campaigns = Array.isArray(activeCampaigns) ? activeCampaigns : [];
  const links: FooterLink[] = [
    { href: "/shop", label: "All Products" },
    { href: "/new-arrivals", label: "New Arrivals" },
    // The real collection view, not a sort order -- it narrows the
    // catalogue to products that qualify (see lib/customer-favourites.ts)
    // and has its own h1 and canonical.
    { href: "/shop?collection=best-sellers", label: "Best Sellers" },
    { href: "/combo-deals", label: "Combo Deals" },
  ];

  const campaign = campaigns[0];
  if (campaign?.slug && campaign.name) {
    links.push({ href: `/campaign/${campaign.slug}`, label: campaign.name });
  }

  return links;
}
