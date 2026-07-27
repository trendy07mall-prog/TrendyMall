"use client";

import { useRouter } from "next/navigation";
import {
  ADMIN_SORT_LABELS,
  adminFilterStateToParams,
  countActiveAdminFilters,
} from "@/lib/admin/product-filters";
import type {
  AdminProductFilterState,
  AdminSortOption,
  AdminStatusFilter,
  AdminStockFilter,
} from "@/lib/admin/product-filters";

const selectClass =
  "rounded-[var(--radius-input)] border border-[var(--border)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]";

export function ProductFilterBar({
  basePath,
  state,
  categories,
  brands,
}: {
  basePath: string;
  state: AdminProductFilterState;
  categories: { id: string; name: string }[];
  brands: string[];
}) {
  const router = useRouter();

  function apply(next: Partial<AdminProductFilterState>) {
    const qs = adminFilterStateToParams({ ...state, ...next }).toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  }

  const activeCount = countActiveAdminFilters(state);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        className={selectClass}
        value={state.categoryIds[0] ?? ""}
        onChange={(e) => apply({ categoryIds: e.target.value ? [e.target.value] : [] })}
        aria-label="Category"
      >
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      <select
        className={selectClass}
        value={state.brands[0] ?? ""}
        onChange={(e) => apply({ brands: e.target.value ? [e.target.value] : [] })}
        aria-label="Brand"
      >
        <option value="">All brands</option>
        {brands.map((b) => (
          <option key={b} value={b}>
            {b}
          </option>
        ))}
      </select>

      <select
        className={selectClass}
        value={state.status}
        onChange={(e) => apply({ status: e.target.value as AdminStatusFilter })}
        aria-label="Status"
      >
        <option value="">All statuses</option>
        <option value="published">Published</option>
        <option value="draft">Draft</option>
        <option value="deleted">Deleted</option>
      </select>

      <select
        className={selectClass}
        value={state.stockStatus}
        onChange={(e) => apply({ stockStatus: e.target.value as AdminStockFilter })}
        aria-label="Stock status"
      >
        <option value="">All stock</option>
        <option value="in_stock">In Stock</option>
        <option value="low_stock">Low Stock</option>
        <option value="out_of_stock">Out of Stock</option>
      </select>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={state.featured}
          onChange={(e) => apply({ featured: e.target.checked })}
        />
        Featured only
      </label>

      <input
        type="number"
        min="0"
        placeholder="Min price"
        value={state.minPrice}
        onChange={(e) => apply({ minPrice: e.target.value })}
        className={`w-28 ${selectClass}`}
      />
      <input
        type="number"
        min="0"
        placeholder="Max price"
        value={state.maxPrice}
        onChange={(e) => apply({ maxPrice: e.target.value })}
        className={`w-28 ${selectClass}`}
      />

      <select
        className={selectClass}
        value={state.sort}
        onChange={(e) => apply({ sort: e.target.value as AdminSortOption })}
        aria-label="Sort by"
      >
        {(Object.keys(ADMIN_SORT_LABELS) as AdminSortOption[]).map((option) => (
          <option key={option} value={option}>
            Sort: {ADMIN_SORT_LABELS[option]}
          </option>
        ))}
      </select>

      {activeCount > 0 && (
        <button
          type="button"
          onClick={() => router.push(basePath)}
          className="text-sm text-[var(--muted)] underline"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
