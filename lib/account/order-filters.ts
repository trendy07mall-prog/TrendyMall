// Mirrors lib/admin/order-filters.ts's URL-searchParam-driven shape, but
// simpler: a customer only ever needs to search their own order numbers
// (no name/phone search — it's always the same customer) and picks from
// 4 tabs instead of a status dropdown.

export type AccountOrderTab = "all" | "active" | "delivered" | "cancelled";

const VALID_TABS: AccountOrderTab[] = ["all", "active", "delivered", "cancelled"];

export interface AccountOrderFilterState {
  search: string;
  tab: AccountOrderTab;
}

export function parseAccountOrderFilterState(
  sp: Record<string, string | string[] | undefined>,
): AccountOrderFilterState {
  const get = (key: string): string => (typeof sp[key] === "string" ? (sp[key] as string) : "");
  const tabRaw = get("tab");

  return {
    search: get("search"),
    tab: (VALID_TABS as string[]).includes(tabRaw) ? (tabRaw as AccountOrderTab) : "all",
  };
}

export function accountOrderFilterStateToParams(state: AccountOrderFilterState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.search) params.set("search", state.search);
  if (state.tab !== "all") params.set("tab", state.tab);
  return params;
}
