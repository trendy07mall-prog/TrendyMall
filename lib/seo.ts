// Shared rules for the parts of a page's metadata that are computed rather
// than written by hand: the title length budget, the category title
// pattern, and the robots value for pages that should stay out of the
// index.
//
// Pure functions only, no data access, so every rule here is unit-tested
// (see seo.test.ts) without a database.

/**
 * What Next appends to every page title via `seo.title_template`
 * (`store_settings`, currently `%s | TrendyMall`). Hardcoded here because
 * these helpers have to know the finished length to budget for it, and a
 * title that silently overflows is the exact bug they exist to prevent.
 *
 * If the template is ever changed in Settings, change this with it.
 */
export const TITLE_SUFFIX = " | TrendyMall";

/**
 * Google truncates a search result title around 60 characters. Longer is
 * not penalised, it is just cut off mid-word in the SERP, so the words
 * that matter should fit inside it.
 */
export const MAX_TITLE_LENGTH = 60;

/** Characters a title must never end on after being cut short. */
const TRAILING_PUNCTUATION = /[\s,|\-–—:;]+$/;

/**
 * Prepares one page's own title segment: the part Next then appends
 * `TITLE_SUFFIX` to.
 *
 * Two jobs:
 *
 * 1. **Strip a suffix that is already there.** 12 of 20 products had
 *    `| TrendyMall` typed into `products.meta_title` in admin, and the
 *    template appended a second one, so the live titles read
 *    "… | TrendyMall | TrendyMall". Stripping it here fixes every one of
 *    them at once and, unlike editing the rows, keeps working when
 *    somebody types it again tomorrow.
 *
 * 2. **Fit the 60-character budget.** Preferring to drop whole
 *    `|`-separated clauses rather than cutting mid-phrase: a title written
 *    as "Name | Feature | Feature" loses its least important clause and
 *    still reads as a title, where a blind character cut leaves
 *    "Name | Portable Wire".
 */
export function trimTitleSegment(raw: string): string {
  const stripped = raw.replace(/\s*\|\s*TrendyMall\s*$/i, "").trim();
  const budget = MAX_TITLE_LENGTH - TITLE_SUFFIX.length;
  if (stripped.length <= budget) return stripped;

  const clauses = stripped
    .split("|")
    .map((clause) => clause.trim())
    .filter(Boolean);

  if (clauses.length > 1) {
    let kept = "";
    for (const clause of clauses) {
      const next = kept ? `${kept} | ${clause}` : clause;
      if (next.length > budget) break;
      kept = next;
    }
    // `kept` is empty only when even the first clause overflows on its
    // own, which falls through to the word-boundary cut below.
    if (kept) return kept;
  }

  const cut = stripped.slice(0, budget);
  const lastSpace = cut.lastIndexOf(" ");
  const atWordBoundary = lastSpace > 0 ? cut.slice(0, lastSpace) : cut;
  return atWordBoundary.replace(TRAILING_PUNCTUATION, "");
}

/**
 * Hand-written titles for the categories that carry real commercial
 * intent, keyed by slug.
 *
 * A map rather than a column because `categories` has no `meta_title`
 * field, and adding one is a migration plus admin UI for seven rows that
 * change about once a year. If that ever stops being true, this is the
 * thing to replace with a column.
 *
 * Values are the page's OWN segment — never include `| TrendyMall`, the
 * template adds it. Each one is kept at or under
 * `MAX_TITLE_LENGTH - TITLE_SUFFIX.length` (47), asserted in the tests.
 */
export const CATEGORY_TITLE_OVERRIDES: Record<string, string> = {
  electronic: "Electronics & Audio Accessories in Sri Lanka",
  earphones: "Earphones & Earbuds in Sri Lanka",
  earbuds: "Wireless Earbuds Price in Sri Lanka",
  "headsets-headphones": "Headphones Price in Sri Lanka",
  "portable-speakers": "Bluetooth Speakers Price in Sri Lanka",
  "power-bank": "Power Bank Price in Sri Lanka",
  "trimmers-groomers-clippers": "Hair Trimmers & Clippers Price in Sri Lanka",
  // Deliberately neutral, with no "Price in Sri Lanka": the homepage owns
  // "mobile accessories Sri Lanka", and this category (power banks only)
  // must not compete with it for that phrase.
  "mobile-accessories": "Mobile Accessories",
};

/**
 * A category page's title segment.
 *
 * The override wins; otherwise the keyword pattern, unless adding it
 * would push the finished title past 60 — then the bare category name,
 * which always fits. Only "Trimmers, Groomers & Clippers" hits that
 * fallback today, and it has an override anyway.
 */
export function categoryTitleSegment(slug: string, name: string): string {
  const override = CATEGORY_TITLE_OVERRIDES[slug];
  if (override) return override;

  const withKeyword = `${name} Price in Sri Lanka`;
  return withKeyword.length + TITLE_SUFFIX.length <= MAX_TITLE_LENGTH ? withKeyword : name;
}

/**
 * The meta description a category falls back to when nobody has written
 * one into `categories.description`. 21 of 23 categories are in that
 * state today.
 *
 * Deliberately short and honest: it claims only cash on delivery, which
 * is a real, enabled payment method (`payment.cod_enabled`). It is a
 * placeholder, not the goal — the real per-category copy is a separate
 * piece of work.
 */
export function categoryDescriptionFallback(name: string): string {
  return `Shop ${name} at TrendyMall. Best prices in Sri Lanka with cash on delivery.`;
}

/**
 * For pages that must not be indexed but whose links should still be
 * followed.
 *
 * `follow` matters: these pages sit in the middle of the category tree
 * and link down to the ones that SHOULD rank. `noindex, nofollow` would
 * strand those children, which is the opposite of the intent.
 */
export const NOINDEX_FOLLOW = { index: false, follow: true } as const;
