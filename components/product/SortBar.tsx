"use client";

import { useRouter } from "next/navigation";
import { SORT_LABELS, filterStateToParams } from "@/lib/product-filters";
import type { ProductFilterState, SortOption } from "@/lib/product-filters";

export function SortBar({
  basePath,
  state,
  resultCount,
  totalCount,
  showHighestRated,
  extraQuery,
}: {
  basePath: string;
  state: ProductFilterState;
  resultCount: number;
  totalCount: number;
  showHighestRated: boolean;
  extraQuery?: Record<string, string>;
}) {
  const router = useRouter();

  const options = (Object.keys(SORT_LABELS) as SortOption[]).filter(
    (option) => option !== "highest_rated" || showHighestRated,
  );

  function setSort(sort: SortOption) {
    const qs = filterStateToParams({ ...state, sort }, extraQuery).toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  }

  return (
    <div className="hidden items-center justify-between sm:flex">
      <p className="text-sm text-[var(--muted)]">
        Showing {resultCount} of {totalCount} product{totalCount === 1 ? "" : "s"}
      </p>
      <select
        value={state.sort}
        onChange={(e) => setSort(e.target.value as SortOption)}
        aria-label="Sort products"
        className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            Sort: {SORT_LABELS[option]}
          </option>
        ))}
      </select>
    </div>
  );
}
