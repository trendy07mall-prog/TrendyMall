"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FilterDrawer } from "@/components/product/FilterDrawer";
import { countActiveFilters, filterStateToParams, SORT_LABELS } from "@/lib/product-filters";
import type { ProductFilterState, SortOption } from "@/lib/product-filters";

export function MobileFilterSortBar({
  basePath,
  state,
  categories,
  brands,
  tags,
  attributes,
  showCategoryFacet,
  showRatingFacet,
  extraQuery,
  variant = "default",
}: {
  basePath: string;
  state: ProductFilterState;
  categories: { slug: string; name: string; count: number; depth: number }[];
  brands: { name: string; count: number }[];
  tags: { slug: string; name: string; count: number }[];
  attributes: { attributeName: string; attributeSlug: string; values: { name: string; slug: string; count: number }[] }[];
  showCategoryFacet: boolean;
  showRatingFacet: boolean;
  extraQuery?: Record<string, string>;
  // "shop" opts into the /shop redesign's toolbar/sort-sheet restyle — also
  // shared by /category and /search, which omit this and keep today's
  // appearance untouched.
  variant?: "default" | "shop";
}) {
  const router = useRouter();
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const activeCount = countActiveFilters(state);

  useEffect(() => {
    if (!sortOpen) return;
    document.body.style.overflow = "hidden";
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setSortOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [sortOpen]);

  const sortOptions = (Object.keys(SORT_LABELS) as SortOption[]).filter(
    (option) => option !== "highest_rated" || showRatingFacet,
  );

  function setSort(sort: SortOption) {
    const qs = filterStateToParams({ ...state, sort }, extraQuery).toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
    setSortOpen(false);
  }

  return (
    <>
      <div
        className={`sticky top-0 z-30 flex gap-3 border-y border-[var(--border)] bg-white py-3 sm:hidden ${
          variant === "shop" ? "px-1" : ""
        }`}
      >
        <button
          type="button"
          onClick={() => setFilterOpen(true)}
          className={`transition-brand relative flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[var(--radius-btn)] border border-[var(--border)] font-medium ${
            variant === "shop" ? "py-3 text-base" : "py-2.5 text-sm"
          }`}
        >
          Filter
          {activeCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--foreground)] px-1 text-[10px] text-white">
              {activeCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setSortOpen(true)}
          className={`transition-brand flex min-h-11 flex-1 items-center justify-center rounded-[var(--radius-btn)] border border-[var(--border)] font-medium ${
            variant === "shop" ? "py-3 text-base" : "py-2.5 text-sm"
          }`}
        >
          Sort
        </button>
      </div>

      {filterOpen && (
        <FilterDrawer
          onClose={() => setFilterOpen(false)}
          basePath={basePath}
          state={state}
          categories={categories}
          brands={brands}
          tags={tags}
          attributes={attributes}
          showCategoryFacet={showCategoryFacet}
          showRatingFacet={showRatingFacet}
          extraQuery={extraQuery}
          variant={variant}
        />
      )}

      {sortOpen && (
        <div className="fixed inset-0 z-50 sm:hidden">
          <button
            type="button"
            aria-label="Close sort options"
            className="absolute inset-0 bg-black/40"
            onClick={() => setSortOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Sort by"
            className={`absolute right-0 bottom-0 left-0 bg-white p-4 shadow-xl ${
              variant === "shop" ? "rounded-t-[20px]" : "rounded-t-2xl"
            }`}
          >
            <p className="mb-2 text-sm font-semibold">Sort by</p>
            <div className="flex flex-col">
              {sortOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setSort(option)}
                  className={`min-h-11 rounded-lg px-3 py-3 text-left text-sm ${
                    state.sort === option ? "font-semibold" : ""
                  }`}
                >
                  {SORT_LABELS[option]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
