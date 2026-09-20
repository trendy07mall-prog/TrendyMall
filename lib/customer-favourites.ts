// Every tunable for the homepage "Customer Favourites" carousel, plus the
// pure rules that decide which mode it runs in and what it says. Kept in
// one file so the thresholds and the copy can be changed without opening a
// component, and so the mode decision is unit-testable without a database.

// --- tunables ----------------------------------------------------------

/** Approved CUSTOMER reviews a product needs to qualify as Top Rated. */
export const TOP_RATED_MIN_REVIEWS = 1;

/** Average customer rating a product needs to qualify as Top Rated. */
export const TOP_RATED_MIN_RATING = 4.5;

/** How far back Best Sellers counts delivered orders. */
export const BEST_SELLER_WINDOW_DAYS = 90;

/** Most products the carousel will ever show. */
export const SECTION_LIMIT = 12;

/**
 * Below this, the section does not render at all -- a two-card carousel
 * reads as broken rather than curated. Applies to whichever mode was
 * chosen, so a thin Top Rated set falls through to Best Sellers first and
 * only then disappears.
 */
export const SECTION_MIN_PRODUCTS = 3;

/** Server-side cache window for the whole section, in seconds. */
export const REVALIDATE_SECONDS = 15 * 60;

// --- mode --------------------------------------------------------------

export type FavouritesMode = "top_rated" | "best_sellers";

/**
 * The ?collection= value each mode links to on /shop. These are the same
 * two rule sets the homepage carousel uses -- see getCollectionProductIds
 * in lib/data/customer-favourites.ts, which both the carousel and the shop
 * page call, so the two can never disagree about what qualifies.
 *
 * Previously the links were ?sort=highest_rated / ?sort=best_selling,
 * which only REORDERED the full catalogue instead of narrowing it.
 */
export const COLLECTION_SLUGS = {
  top_rated: "top-rated",
  best_sellers: "best-sellers",
} as const;

export type CollectionSlug = (typeof COLLECTION_SLUGS)[keyof typeof COLLECTION_SLUGS];

const MODE_BY_COLLECTION: Record<string, FavouritesMode> = {
  "top-rated": "top_rated",
  "best-sellers": "best_sellers",
};

/**
 * Resolves a raw ?collection= value. Anything unrecognised returns null,
 * and the shop page then behaves exactly as if no collection were set --
 * an unknown value is ignored, never an error or an empty result.
 */
export function parseCollection(raw: string | undefined | null): FavouritesMode | null {
  if (!raw) return null;
  return MODE_BY_COLLECTION[raw.trim().toLowerCase()] ?? null;
}

export interface FavouritesCopy {
  eyebrow: string;
  heading: string;
  subtitle: string;
  badge: string;
  linkLabel: string;
  linkLabelShort: string;
  href: string;
  ariaLabel: string;
  swipeHintSuffix: string;
}

// Everything that differs between the two modes, in one place, so a mode
// can never end up with (say) a Top Rated heading over a Best Seller
// badge -- including the /shop collection each one links to.
export const FAVOURITES_COPY: Record<FavouritesMode, FavouritesCopy> = {
  top_rated: {
    eyebrow: "CUSTOMER FAVOURITES",
    heading: "Top Rated",
    subtitle: "Rated highest by TrendyMall customers",
    badge: "Top Rated",
    linkLabel: "View all top rated",
    linkLabelShort: "View all",
    href: "/shop?collection=top-rated",
    ariaLabel: "Top rated products",
    swipeHintSuffix: "top rated products",
  },
  best_sellers: {
    eyebrow: "CUSTOMER FAVOURITES",
    heading: "Best Sellers",
    subtitle: "What TrendyMall customers are buying most",
    badge: "Best Seller",
    linkLabel: "View all best sellers",
    linkLabelShort: "View all",
    href: "/shop?collection=best-sellers",
    ariaLabel: "Best selling products",
    swipeHintSuffix: "best sellers",
  },
};

/**
 * Top Rated wins whenever it has enough products to fill a credible
 * carousel; otherwise the section falls back to Best Sellers. The caller
 * still has to check the chosen mode's own count against
 * SECTION_MIN_PRODUCTS -- Best Sellers can be too thin as well, and then
 * nothing renders.
 */
export function pickFavouritesMode(topRatedCount: number): FavouritesMode {
  return topRatedCount >= SECTION_MIN_PRODUCTS ? "top_rated" : "best_sellers";
}

// --- ranking -----------------------------------------------------------

export interface RankableProduct {
  id: string;
  avgRating: number;
  reviewCount: number;
  createdAt: string;
}

export function qualifiesAsTopRated(product: {
  avgRating: number;
  reviewCount: number;
}): boolean {
  return (
    product.reviewCount >= TOP_RATED_MIN_REVIEWS && product.avgRating >= TOP_RATED_MIN_RATING
  );
}

/**
 * Rating first, then how many people said it, then the newest product --
 * so a lone 5.0 does not permanently outrank a 4.9 with forty reviews any
 * further than its rating earns, and ties resolve to fresher stock.
 * Returns a new array; the input is not mutated.
 */
export function sortTopRated<T extends RankableProduct>(products: T[]): T[] {
  return [...products].sort(
    (a, b) =>
      b.avgRating - a.avgRating ||
      b.reviewCount - a.reviewCount ||
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

// --- card helpers ------------------------------------------------------

/**
 * Whole-percent discount, or null when there is nothing to advertise. A
 * compare-at price that is missing, equal to, or below the sale price is
 * not a discount -- the card shows no strikethrough and no chip in those
 * cases rather than "-0%" or a negative number.
 */
export function discountPercent(actual: number, special: number | null): number | null {
  if (special == null || !(actual > special) || actual <= 0) return null;
  return Math.round(((actual - special) / actual) * 100);
}

/**
 * The quote under a card's rating row. Plain text only: review comments
 * come from a plain textarea today, but this strips tags and collapses
 * whitespace anyway rather than trusting that, since the string is
 * rendered straight into the card.
 *
 * Returns null when there is nothing worth showing, and the card then
 * omits the line entirely rather than leaving a gap.
 *
 * 90 characters is about two full lines in the card's detail column, which
 * is what line-clamp-2 will show. The reviewer's name is rendered as its
 * own line BELOW this rather than appended here -- see the card -- because
 * anything inside the clamped paragraph is pushed off the end by a quote
 * of any useful length and never appears.
 */
export function reviewQuote(comment: string | null | undefined, maxLength = 90): string | null {
  if (!comment) return null;
  const text = comment
    // Reference-style link definitions on their own lines ("[1]: https://…"),
    // which carry no prose at all.
    .replace(/^\s*\[[^\]]*\]:\s*\S+.*$/gm, " ")
    // Inline links and images: keep the label, drop the URL.
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    // Any HTML that made it into a comment.
    .replace(/<[^>]+>/g, " ")
    // Emphasis, inline code and heading/quote/list markers. Real review
    // text reached this function with literal "**" in it (a comment pasted
    // in from a formatted source), which would otherwise print as-is.
    .replace(/(\*\*|__|[*_`~])/g, "")
    .replace(/^\s{0,3}(#{1,6}|>)\s*/gm, " ")
    .replace(/^\s*[-+]\s+/gm, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return null;
  return text.length > maxLength ? `${text.slice(0, maxLength).trimEnd()}…` : text;
}

/**
 * The reviewer's display name for the card: first name only, never a
 * surname, e-mail or phone number. The view in sql/080 already narrows to
 * a first name; this guards the app side of the same rule (and drops
 * anything that still looks like contact details rather than a name).
 */
export function reviewerFirstName(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const first = raw.trim().split(/\s+/)[0] ?? "";
  if (!first) return null;
  // An e-mail address is not a name.
  if (first.includes("@")) return null;
  // Neither is a phone number. Tested as "contains no letter at all"
  // rather than "looks like digits": a country code split off on its own
  // ("+94" from "+94 77 123 4567") is only two digits and slipped past a
  // digit-count rule, but it still has no letters in it.
  if (!/\p{L}/u.test(first)) return null;
  return first.length > 20 ? `${first.slice(0, 20)}…` : first;
}
