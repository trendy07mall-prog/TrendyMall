"use client";

import { useMemo, useState } from "react";
import type { CustomerSummary } from "@/lib/admin/customer-segments";
import { CustomerStats } from "./CustomerStats";
import { CustomersTable } from "./CustomersTable";
import { CustomerDetailPanel } from "./CustomerDetailPanel";
import { ExportCustomersButton } from "./ExportCustomersButton";
import {
  DEFAULT_SORT,
  SORT_KEYS,
  SORT_LABELS,
  filterCustomers,
  sortCustomers,
  type SortKey,
  type SortState,
} from "./customer-sort";

// Real pagination even though today's list is four rows: the page size is
// what stops this from becoming a wall of rows later, and wiring it now
// means the footer count is honest from the start rather than a label that
// has to be replaced the first time the shop grows.
const PAGE_SIZE = 25;

export function CustomersManager({ customers }: { customers: CustomerSummary[] }) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<CustomerSummary | null>(null);

  // Filter then sort, so the sort applies to what survived the search
  // rather than to the full list. Both the stats strip and the CSV export
  // read this same array, which is what keeps the three in agreement.
  const visible = useMemo(
    () => sortCustomers(filterCustomers(customers, search), sort),
    [customers, search, sort],
  );

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  // Clamped rather than reset: deleting a search term while on page 3 of
  // the old result set should land somewhere real, not on an empty page.
  const currentPage = Math.min(page, pageCount);
  const pageRows = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="admin-customers">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">Customers</h1>
          {/* The explicit {" "} is load-bearing. JSX strips the leading
              whitespace of a text node that wraps to the next line, so
              "...customers} who've" rendered as "4 customerswho've" -- the
              original typo on this page, which survives an innocent-looking
              rewrite unless the space is a real expression. */}
          <p className="mt-2 text-sm text-[var(--ac-text-2)]">
            {customers.length} {customers.length === 1 ? "customer" : "customers"}{" "}
            who&apos;ve placed at least one order.
          </p>
        </div>
        <ExportCustomersButton customers={visible} />
      </div>

      <CustomerStats customers={visible} />

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search name, email or phone…"
          aria-label="Search customers"
          className="w-full rounded-[10px] border border-[var(--border)] bg-[var(--color-card)] px-3 py-2 text-sm focus:border-[var(--ac-navy)] focus:outline-none focus:ring-1 focus:ring-[var(--ac-navy)] sm:max-w-xs"
        />
        <div className="flex items-center gap-2">
          <label htmlFor="customer-sort" className="text-sm text-[var(--ac-text-2)]">
            Sort by
          </label>
          {/* Same state the column headers write to, so the two can never
              show different things. */}
          <select
            id="customer-sort"
            value={sort.key}
            onChange={(e) => setSort({ key: e.target.value as SortKey, direction: sort.direction })}
            className="rounded-[10px] border border-[var(--border)] bg-[var(--color-card)] px-3 py-2 text-sm focus:border-[var(--ac-navy)] focus:outline-none focus:ring-1 focus:ring-[var(--ac-navy)]"
          >
            {SORT_KEYS.map((key) => (
              <option key={key} value={key}>
                {SORT_LABELS[key]}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() =>
              setSort({ key: sort.key, direction: sort.direction === "asc" ? "desc" : "asc" })
            }
            aria-label={`Sort ${sort.direction === "asc" ? "descending" : "ascending"}`}
            className="rounded-[10px] border border-[var(--border)] bg-[var(--color-card)] px-3 py-2 text-sm hover:bg-black/5"
          >
            {sort.direction === "asc" ? "▲ Asc" : "▼ Desc"}
          </button>
        </div>
      </div>

      <CustomersTable
        customers={pageRows}
        sort={sort}
        onSortChange={(next) => {
          setSort(next);
          setPage(1);
        }}
        onSelect={setSelected}
      />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--ac-text-2)]">
          Showing {pageRows.length} of {visible.length} customer
          {visible.length === 1 ? "" : "s"}
          {search.trim() && ` (filtered from ${customers.length})`}
        </p>
        {pageCount > 1 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="rounded-full border border-[var(--border)] px-3 py-1.5 text-sm disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-sm text-[var(--ac-text-2)]">
              Page {currentPage} of {pageCount}
            </span>
            <button
              type="button"
              onClick={() => setPage(currentPage + 1)}
              disabled={currentPage === pageCount}
              className="rounded-full border border-[var(--border)] px-3 py-1.5 text-sm disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {selected && (
        <CustomerDetailPanel customer={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
