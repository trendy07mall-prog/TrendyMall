import type { CustomerSummary } from "@/lib/admin/customer-segments";

// The three sortable columns, shared by the toolbar select and the clickable
// table headers so the two are the same state rather than two that have to
// be kept in step.
export type SortKey = "orderCount" | "totalSpent" | "lastOrderAt";
export type SortDirection = "asc" | "desc";

export interface SortState {
  key: SortKey;
  direction: SortDirection;
}

export const SORT_LABELS: Record<SortKey, string> = {
  orderCount: "Orders",
  totalSpent: "Total spent",
  lastOrderAt: "Last order",
};

export const SORT_KEYS: SortKey[] = ["orderCount", "totalSpent", "lastOrderAt"];

// Matches the page's previous default (highest spend first), so the list
// opens looking the way it always has.
export const DEFAULT_SORT: SortState = { key: "totalSpent", direction: "desc" };

export function sortCustomers(
  customers: CustomerSummary[],
  { key, direction }: SortState,
): CustomerSummary[] {
  const factor = direction === "asc" ? 1 : -1;
  return [...customers].sort((a, b) => {
    const left = key === "lastOrderAt" ? new Date(a.lastOrderAt).getTime() : a[key];
    const right = key === "lastOrderAt" ? new Date(b.lastOrderAt).getTime() : b[key];
    if (left === right) return a.name.localeCompare(b.name);
    return left < right ? -1 * factor : 1 * factor;
  });
}

// Client-side, which is correct at today's scale (a handful of customers,
// all already in memory because the list itself is derived from one orders
// query). It searches the fields the admin can see in the row.
//
// Move this server-side once the customer count grows past what is
// reasonable to send in one payload -- the list would then need real
// server-side pagination over a query rather than slicing an in-memory
// array, and this filter would become an .or()/ilike like
// getAdminOrders' search already is.
export function filterCustomers(
  customers: CustomerSummary[],
  search: string,
): CustomerSummary[] {
  const term = search.trim().toLowerCase();
  if (!term) return customers;
  return customers.filter((c) =>
    [c.name, c.email, c.phone].some((field) => (field ?? "").toLowerCase().includes(term)),
  );
}
