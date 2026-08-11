import type { AttributeValue, Brand, Category, Tag } from "@/types";

// Shared by getNewArrivals() and the shop filter's "New Arrival" checkbox
// so both surfaces agree on what "new" means -- previously the filter used
// a 30-day created_at cutoff while the homepage carousel ignored age
// entirely (newest N regardless of how old), so a stale catalog could show
// a 2-year-old product as "new" on the homepage while it failed its own
// filter checkbox on /shop.
export const NEW_ARRIVAL_WINDOW_DAYS = 30;

export function newArrivalCutoff(): string {
  return new Date(Date.now() - NEW_ARRIVAL_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

export type SortOption =
  | "newest"
  | "price_asc"
  | "price_desc"
  | "best_selling"
  | "highest_rated"
  | "most_popular";

const SORT_OPTIONS: SortOption[] = [
  "newest",
  "price_asc",
  "price_desc",
  "best_selling",
  "highest_rated",
  "most_popular",
];

export const SORT_LABELS: Record<SortOption, string> = {
  newest: "Newest",
  price_asc: "Price: Low to High",
  price_desc: "Price: High to Low",
  best_selling: "Best Selling",
  highest_rated: "Highest Rated",
  most_popular: "Most Popular",
};

// UI/URL-facing filter state — everything as strings/booleans matching how
// it round-trips through a querystring. `toProductListFilters()` below
// converts this into the DB-facing shape `lib/data/products.ts` queries
// actually use (numbers, resolved category ids).
export interface ProductFilterState {
  categorySlugs: string[];
  brands: string[];
  tagSlugs: string[];
  attributeValueSlugs: string[];
  minPrice: string;
  maxPrice: string;
  minRating: string;
  inStock: boolean;
  outOfStock: boolean;
  cod: boolean;
  freeDelivery: boolean;
  warranty: boolean;
  onSale: boolean;
  newArrival: boolean;
  featured: boolean;
  campaign: boolean;
  sort: SortOption;
}

export interface ProductListFilters {
  categoryIds?: string[];
  // Display-facing brand names (from the URL) -- kept for chips/labels.
  // The actual DB query filters on `brandIds` (resolved below), not this,
  // since matching by raw text would miss casing-drifted product rows.
  brands?: string[];
  brandIds?: string[];
  tagIds?: string[];
  attributeValueIds?: string[];
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  inStock?: boolean;
  outOfStock?: boolean;
  cod?: boolean;
  freeDelivery?: boolean;
  warranty?: boolean;
  onSale?: boolean;
  newArrival?: boolean;
  featured?: boolean;
  campaign?: boolean;
  sort: SortOption;
}

export function parseProductFilterState(
  sp: Record<string, string | string[] | undefined>,
): ProductFilterState {
  const get = (key: string): string => (typeof sp[key] === "string" ? (sp[key] as string) : "");
  const flag = (key: string): boolean => get(key) === "1";
  const sortRaw = get("sort");

  return {
    categorySlugs: get("category") ? get("category").split(",").filter(Boolean) : [],
    brands: get("brand") ? get("brand").split(",").filter(Boolean) : [],
    tagSlugs: get("tag") ? get("tag").split(",").filter(Boolean) : [],
    attributeValueSlugs: get("attr") ? get("attr").split(",").filter(Boolean) : [],
    minPrice: get("minPrice"),
    maxPrice: get("maxPrice"),
    minRating: get("rating"),
    inStock: flag("inStock"),
    outOfStock: flag("outOfStock"),
    cod: flag("cod"),
    freeDelivery: flag("freeDelivery"),
    warranty: flag("warranty"),
    onSale: flag("onSale"),
    newArrival: flag("newArrival"),
    featured: flag("featured"),
    campaign: flag("campaign"),
    sort: (SORT_OPTIONS as string[]).includes(sortRaw) ? (sortRaw as SortOption) : "newest",
  };
}

// `extra` carries params the filter system doesn't own but still needs to
// survive every filter change — currently just /search's `q`, so changing a
// filter there doesn't silently drop the search query.
export function filterStateToParams(
  state: ProductFilterState,
  extra?: Record<string, string>,
): URLSearchParams {
  const params = new URLSearchParams();
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (value) params.set(key, value);
    }
  }
  if (state.categorySlugs.length > 0) params.set("category", state.categorySlugs.join(","));
  if (state.brands.length > 0) params.set("brand", state.brands.join(","));
  if (state.tagSlugs.length > 0) params.set("tag", state.tagSlugs.join(","));
  if (state.attributeValueSlugs.length > 0) params.set("attr", state.attributeValueSlugs.join(","));
  if (state.minPrice) params.set("minPrice", state.minPrice);
  if (state.maxPrice) params.set("maxPrice", state.maxPrice);
  if (state.minRating) params.set("rating", state.minRating);
  if (state.inStock) params.set("inStock", "1");
  if (state.outOfStock) params.set("outOfStock", "1");
  if (state.cod) params.set("cod", "1");
  if (state.freeDelivery) params.set("freeDelivery", "1");
  if (state.warranty) params.set("warranty", "1");
  if (state.onSale) params.set("onSale", "1");
  if (state.newArrival) params.set("newArrival", "1");
  if (state.featured) params.set("featured", "1");
  if (state.campaign) params.set("campaign", "1");
  if (state.sort !== "newest") params.set("sort", state.sort);
  return params;
}

// The DB layer filters on category_id, but the URL (and the sidebar's
// checkboxes) use slugs for readability/shareability — resolved here using
// whatever categories list the page already fetched for the sidebar. Brand
// names resolve to ids the same way (case-insensitively, since the whole
// point of the brands table is that casing drift between products no
// longer breaks filtering) using the page's already-fetched brand list.
export function toProductListFilters(
  state: ProductFilterState,
  categories: Category[],
  brands: Brand[],
  tags: Tag[],
  attributeValues: AttributeValue[],
): ProductListFilters {
  const idBySlug = new Map(categories.map((c) => [c.slug, c.id] as const));
  const categoryIds = state.categorySlugs
    .map((slug) => idBySlug.get(slug))
    .filter((id): id is string => Boolean(id));

  const brandIdByName = new Map(brands.map((b) => [b.name.toLowerCase(), b.id] as const));
  const brandIds = state.brands
    .map((name) => brandIdByName.get(name.toLowerCase()))
    .filter((id): id is string => Boolean(id));

  const tagIdBySlug = new Map(tags.map((t) => [t.slug, t.id] as const));
  const tagIds = state.tagSlugs
    .map((slug) => tagIdBySlug.get(slug))
    .filter((id): id is string => Boolean(id));

  const attributeValueIdBySlug = new Map(attributeValues.map((v) => [v.slug, v.id] as const));
  const attributeValueIds = state.attributeValueSlugs
    .map((slug) => attributeValueIdBySlug.get(slug))
    .filter((id): id is string => Boolean(id));

  return {
    categoryIds: categoryIds.length > 0 ? categoryIds : undefined,
    brands: state.brands.length > 0 ? state.brands : undefined,
    brandIds: brandIds.length > 0 ? brandIds : undefined,
    tagIds: tagIds.length > 0 ? tagIds : undefined,
    attributeValueIds: attributeValueIds.length > 0 ? attributeValueIds : undefined,
    minPrice: state.minPrice ? Number(state.minPrice) : undefined,
    maxPrice: state.maxPrice ? Number(state.maxPrice) : undefined,
    minRating: state.minRating ? Number(state.minRating) : undefined,
    inStock: state.inStock || undefined,
    outOfStock: state.outOfStock || undefined,
    cod: state.cod || undefined,
    freeDelivery: state.freeDelivery || undefined,
    warranty: state.warranty || undefined,
    onSale: state.onSale || undefined,
    newArrival: state.newArrival || undefined,
    featured: state.featured || undefined,
    campaign: state.campaign || undefined,
    sort: state.sort,
  };
}

export function countActiveFilters(state: ProductFilterState): number {
  return (
    state.categorySlugs.length +
    state.brands.length +
    state.tagSlugs.length +
    state.attributeValueSlugs.length +
    (state.minPrice || state.maxPrice ? 1 : 0) +
    (state.minRating ? 1 : 0) +
    (state.inStock ? 1 : 0) +
    (state.outOfStock ? 1 : 0) +
    (state.cod ? 1 : 0) +
    (state.freeDelivery ? 1 : 0) +
    (state.warranty ? 1 : 0) +
    (state.onSale ? 1 : 0) +
    (state.newArrival ? 1 : 0) +
    (state.featured ? 1 : 0) +
    (state.campaign ? 1 : 0)
  );
}

export const EMPTY_FILTER_STATE: ProductFilterState = {
  categorySlugs: [],
  brands: [],
  tagSlugs: [],
  attributeValueSlugs: [],
  minPrice: "",
  maxPrice: "",
  minRating: "",
  inStock: false,
  outOfStock: false,
  cod: false,
  freeDelivery: false,
  warranty: false,
  onSale: false,
  newArrival: false,
  featured: false,
  campaign: false,
  sort: "newest",
};
