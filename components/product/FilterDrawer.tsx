"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CloseIcon } from "@/components/ui/Icon";
import { FilterGroups } from "@/components/product/FilterGroups";
import { EMPTY_FILTER_STATE, filterStateToParams } from "@/lib/product-filters";
import type { ProductFilterState } from "@/lib/product-filters";

// Mounted by the parent only while open (`{filterOpen && <FilterDrawer .../>}`
// in MobileFilterSortBar) rather than taking an `open` boolean and returning
// null itself — that way `draft` naturally starts fresh from `state` on
// every open via useState's initializer, with no effect needed to resync it.
export function FilterDrawer({
  onClose,
  basePath,
  state,
  categories,
  brands,
  showCategoryFacet,
  showRatingFacet,
  extraQuery,
}: {
  onClose: () => void;
  basePath: string;
  state: ProductFilterState;
  categories: { slug: string; name: string; count: number }[];
  brands: { name: string; count: number }[];
  showCategoryFacet: boolean;
  showRatingFacet: boolean;
  extraQuery?: Record<string, string>;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(state);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  function apply() {
    const qs = filterStateToParams(draft, extraQuery).toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-label="Close filters"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Filters"
        className="absolute top-0 left-0 flex h-full w-80 max-w-[85vw] flex-col bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-4">
          <span className="text-sm font-semibold">Filters</span>
          <button
            type="button"
            aria-label="Close filters"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-black/5"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4">
          <FilterGroups
            state={draft}
            onChange={(partial) => setDraft((d) => ({ ...d, ...partial }))}
            categories={categories}
            brands={brands}
            showCategoryFacet={showCategoryFacet}
            showRatingFacet={showRatingFacet}
          />
        </div>

        <div className="flex gap-3 border-t border-[var(--border)] p-4">
          <button
            type="button"
            onClick={() => setDraft({ ...EMPTY_FILTER_STATE, sort: draft.sort })}
            className="flex-1 rounded-full border border-[var(--border)] px-4 py-2.5 text-sm font-medium"
          >
            Clear all
          </button>
          <button
            type="button"
            onClick={apply}
            className="flex-1 rounded-full bg-[var(--foreground)] px-4 py-2.5 text-sm font-medium text-white"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
