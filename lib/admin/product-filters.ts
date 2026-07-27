// Mirrors lib/product-filters.ts's shape/pattern for the admin products
// list — same URL-searchParam-driven state, same "extra params survive a
// filter change" idea, adapted for admin-specific fields (search, deleted
// status, stock-status tiers) instead of the storefront's promo/service
// checkboxes.

export type AdminSortOption =
  | "newest"
  | "oldest"
  | "price_asc"
  | "price_desc"
  | "best_selling"
  | "most_viewed";

const ADMIN_SORT_OPTIONS: AdminSortOption[] = [
  "newest",
  "oldest",
  "price_asc",
  "price_desc",
  "best_selling",
  "most_viewed",
];

export const ADMIN_SORT_LABELS: Record<AdminSortOption, string> = {
  newest: "Newest",
  oldest: "Oldest",
  price_asc: "Price: Low to High",
  price_desc: "Price: High to Low",
  best_selling: "Best Selling",
  most_viewed: "Most Viewed",
};

export type AdminStatusFilter = "" | "draft" | "published" | "deleted";
export type AdminStockFilter = "" | "in_stock" | "low_stock" | "out_of_stock";

export interface AdminProductFilterState {
  search: string;
  categoryIds: string[];
  brands: string[];
  status: AdminStatusFilter;
  stockStatus: AdminStockFilter;
  featured: boolean;
  minPrice: string;
  maxPrice: string;
  sort: AdminSortOption;
}

export function parseAdminProductFilterState(
  sp: Record<string, string | string[] | undefined>,
): AdminProductFilterState {
  const get = (key: string): string => (typeof sp[key] === "string" ? (sp[key] as string) : "");
  const statusRaw = get("status");
  const stockRaw = get("stockStatus");
  const sortRaw = get("sort");

  return {
    search: get("search"),
    categoryIds: get("category") ? get("category").split(",").filter(Boolean) : [],
    brands: get("brand") ? get("brand").split(",").filter(Boolean) : [],
    status: (["draft", "published", "deleted"] as string[]).includes(statusRaw)
      ? (statusRaw as AdminStatusFilter)
      : "",
    stockStatus: (["in_stock", "low_stock", "out_of_stock"] as string[]).includes(stockRaw)
      ? (stockRaw as AdminStockFilter)
      : "",
    featured: get("featured") === "1",
    minPrice: get("minPrice"),
    maxPrice: get("maxPrice"),
    sort: (ADMIN_SORT_OPTIONS as string[]).includes(sortRaw) ? (sortRaw as AdminSortOption) : "newest",
  };
}

export function adminFilterStateToParams(state: AdminProductFilterState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.search) params.set("search", state.search);
  if (state.categoryIds.length > 0) params.set("category", state.categoryIds.join(","));
  if (state.brands.length > 0) params.set("brand", state.brands.join(","));
  if (state.status) params.set("status", state.status);
  if (state.stockStatus) params.set("stockStatus", state.stockStatus);
  if (state.featured) params.set("featured", "1");
  if (state.minPrice) params.set("minPrice", state.minPrice);
  if (state.maxPrice) params.set("maxPrice", state.maxPrice);
  if (state.sort !== "newest") params.set("sort", state.sort);
  return params;
}

export function countActiveAdminFilters(state: AdminProductFilterState): number {
  return (
    (state.search ? 1 : 0) +
    state.categoryIds.length +
    state.brands.length +
    (state.status ? 1 : 0) +
    (state.stockStatus ? 1 : 0) +
    (state.featured ? 1 : 0) +
    (state.minPrice || state.maxPrice ? 1 : 0)
  );
}

export const EMPTY_ADMIN_FILTER_STATE: AdminProductFilterState = {
  search: "",
  categoryIds: [],
  brands: [],
  status: "",
  stockStatus: "",
  featured: false,
  minPrice: "",
  maxPrice: "",
  sort: "newest",
};
