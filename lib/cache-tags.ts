// Cache tags for the storefront's public, non-personalised reads (see
// lib/data/cached.ts). Kept in one place so a mutation and the read it
// invalidates can't drift apart via a typo -- a mistyped tag string fails
// silently, serving stale data forever, which is exactly the failure mode
// worth designing out.
//
// revalidatePath still exists alongside these in the admin mutations; it
// invalidates a rendered route, whereas these invalidate the underlying
// data regardless of which routes happen to use it. Both matter: a product
// edit has to clear the cached product read AND the pages built from it.
export const CACHE_TAGS = {
  // Near-static store configuration (name, logo, contact, hours).
  settings: "settings",
  // Category tree shown in the header on every page.
  categories: "categories",
  // Published product data: names, prices, images, stock, publish state.
  products: "products",
  // Campaigns plus their sections/items and per-variant featured pricing.
  campaigns: "campaigns",
  // Per-campaign units sold. Moves with every order rather than with admin
  // edits, so it's cached separately and briefly -- see lib/data/cached.ts.
  soldCounts: "sold-counts",
  // Approved customer reviews and the rating summary built from them.
  // Separate from `products` because the things that change them are
  // different events -- a customer submitting one, and an admin approving,
  // rejecting or deleting one -- none of which are product edits.
  reviews: "reviews",
} as const;

// Seconds. Deliberately three tiers rather than one number:
//
// - settings/categories change only when an admin edits them, and those
//   edits already revalidate by tag, so the TTL is just a backstop.
// - products/campaigns also invalidate by tag on edit, but carry stock,
//   which moves on every order -- a shorter backstop bounds how long a
//   just-sold-out item can still look purchasable. Checkout re-validates
//   stock server-side (fetchValidatedServerCart), so that window is a
//   display annoyance, never an oversell.
// - sold counts have no admin edit to invalidate them at all; they only
//   move as orders arrive, so they get the shortest TTL and rely on it.
export const CACHE_TTL = {
  settings: 60 * 60,
  categories: 60 * 60,
  products: 5 * 60,
  campaigns: 5 * 60,
  soldCounts: 60,
  // Reviews only become visible after an admin approves them, and that
  // action invalidates this tag directly, so the TTL is a backstop --
  // matched to products since the PDP reads both together.
  reviews: 5 * 60,
} as const;
