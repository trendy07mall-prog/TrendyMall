"use client";

import { useRouter } from "next/navigation";
import { FilterGroups } from "@/components/product/FilterGroups";
import { EMPTY_FILTER_STATE, filterStateToParams } from "@/lib/product-filters";
import type { ProductFilterState } from "@/lib/product-filters";

export function FilterSidebar({
  basePath,
  state,
  categories,
  brands,
  tags,
  attributes,
  showCategoryFacet,
  showRatingFacet,
  extraQuery,
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
}) {
  const router = useRouter();

  function apply(next: ProductFilterState) {
    const qs = filterStateToParams(next, extraQuery).toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  }

  return (
    <aside className="hidden w-64 shrink-0 lg:block">
      <div
        className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--color-card)] p-[var(--card-padding)] shadow-[var(--shadow-card)]"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Filters</h2>
          <button
            type="button"
            onClick={() => apply({ ...EMPTY_FILTER_STATE, sort: state.sort })}
            className="text-xs text-[var(--muted)] underline"
          >
            Clear all
          </button>
        </div>
        <FilterGroups
          state={state}
          onChange={(partial) => apply({ ...state, ...partial })}
          categories={categories}
          brands={brands}
          tags={tags}
          attributes={attributes}
          showCategoryFacet={showCategoryFacet}
          showRatingFacet={showRatingFacet}
        />
      </div>
    </aside>
  );
}
