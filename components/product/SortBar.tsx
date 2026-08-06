"use client";

import { useRouter } from "next/navigation";
import { ChevronDownIcon } from "@/components/ui/Icon";
import { SORT_LABELS, filterStateToParams } from "@/lib/product-filters";
import type { ProductFilterState, SortOption } from "@/lib/product-filters";

export function SortBar({
  basePath,
  state,
  resultCount,
  totalCount,
  showHighestRated,
  extraQuery,
  viewToggle,
  variant = "default",
}: {
  basePath: string;
  state: ProductFilterState;
  resultCount: number;
  totalCount: number;
  showHighestRated: boolean;
  extraQuery?: Record<string, string>;
  viewToggle?: React.ReactNode;
  // "shop" opts into the /shop redesign's toolbar shell + "{count}
  // Products" wording — shared by /category and /search too, which omit
  // this and keep today's "Showing X of Y product(s)" text/appearance.
  variant?: "default" | "shop";
}) {
  const router = useRouter();
  const isShop = variant === "shop";

  const options = (Object.keys(SORT_LABELS) as SortOption[]).filter(
    (option) => option !== "highest_rated" || showHighestRated,
  );

  function setSort(sort: SortOption) {
    const qs = filterStateToParams({ ...state, sort }, extraQuery).toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  }

  return (
    <div
      className={`hidden items-center sm:flex ${isShop ? "justify-end" : "justify-between"} ${
        isShop ? "rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--color-card)] p-4" : ""
      }`}
    >
      {/* "shop" drops the product-count text entirely per the compact
          redesign -- the /category and /search default variant keeps its
          "Showing X of Y product(s)" text unchanged. */}
      {!isShop && (
        <p className="text-sm text-[var(--muted)]">
          Showing {resultCount} of {totalCount} product{totalCount === 1 ? "" : "s"}
        </p>
      )}
      <div className="flex items-center gap-3">
        {viewToggle}
        <div className="relative">
          <select
            value={state.sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            aria-label="Sort products"
            className={`transition-brand appearance-none rounded-[var(--radius-input)] border border-[var(--border)] bg-[var(--color-card)] pr-9 pl-3 focus:outline-none focus:ring-1 focus:ring-[var(--foreground)] ${
              isShop ? "py-2.5 text-[15px]" : "py-2 text-sm"
            }`}
          >
            {options.map((option) => (
              <option key={option} value={option}>
                Sort: {SORT_LABELS[option]}
              </option>
            ))}
          </select>
          <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted)]" />
        </div>
      </div>
    </div>
  );
}
