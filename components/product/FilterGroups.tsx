"use client";

import { StarRating } from "@/components/product/StarRating";
import type { ProductFilterState } from "@/lib/product-filters";

const inputClass =
  "w-full min-w-0 rounded-[var(--radius-sm)] border border-[var(--border)] bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]";

interface CategoryFacet {
  slug: string;
  name: string;
  count: number;
}

interface BrandFacet {
  name: string;
  count: number;
}

export function FilterGroups({
  state,
  onChange,
  categories,
  brands,
  showCategoryFacet,
  showRatingFacet,
}: {
  state: ProductFilterState;
  onChange: (next: Partial<ProductFilterState>) => void;
  categories: CategoryFacet[];
  brands: BrandFacet[];
  showCategoryFacet: boolean;
  showRatingFacet: boolean;
}) {
  return (
    <div className="flex flex-col divide-y divide-[var(--border)]">
      {showCategoryFacet && categories.length > 0 && (
        <FilterGroup title="Category">
          {categories.map((category) => (
            <CheckboxRow
              key={category.slug}
              label={category.name}
              count={category.count}
              checked={state.categorySlugs.includes(category.slug)}
              onChange={(checked) =>
                onChange({
                  categorySlugs: checked
                    ? [...state.categorySlugs, category.slug]
                    : state.categorySlugs.filter((s) => s !== category.slug),
                })
              }
            />
          ))}
        </FilterGroup>
      )}

      {brands.length > 0 && (
        <FilterGroup title="Brand">
          {brands.map((brand) => (
            <CheckboxRow
              key={brand.name}
              label={brand.name}
              count={brand.count}
              checked={state.brands.includes(brand.name)}
              onChange={(checked) =>
                onChange({
                  brands: checked
                    ? [...state.brands, brand.name]
                    : state.brands.filter((b) => b !== brand.name),
                })
              }
            />
          ))}
        </FilterGroup>
      )}

      <FilterGroup title="Price (LKR)">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            placeholder="Min"
            value={state.minPrice}
            onChange={(e) => onChange({ minPrice: e.target.value })}
            className={inputClass}
          />
          <span className="text-[var(--muted)]">–</span>
          <input
            type="number"
            min="0"
            placeholder="Max"
            value={state.maxPrice}
            onChange={(e) => onChange({ maxPrice: e.target.value })}
            className={inputClass}
          />
        </div>
        <input
          type="range"
          min={0}
          max={50000}
          step={500}
          value={state.maxPrice ? Number(state.maxPrice) : 50000}
          onChange={(e) => onChange({ maxPrice: e.target.value })}
          className="mt-3 w-full accent-[var(--foreground)]"
          aria-label="Maximum price"
        />
      </FilterGroup>

      {showRatingFacet && (
        <FilterGroup title="Rating">
          {[4, 3, 2].map((threshold) => (
            <label key={threshold} className="flex items-center gap-2 py-1.5 text-sm">
              <input
                type="radio"
                name="rating"
                checked={state.minRating === String(threshold)}
                onChange={() => onChange({ minRating: String(threshold) })}
              />
              <StarRating rating={threshold} size="sm" />
              <span>&amp; up</span>
            </label>
          ))}
          {state.minRating && (
            <button
              type="button"
              onClick={() => onChange({ minRating: "" })}
              className="mt-1 self-start text-xs text-[var(--muted)] underline"
            >
              Clear rating
            </button>
          )}
        </FilterGroup>
      )}

      <FilterGroup title="Availability">
        <label className="flex items-center gap-2 py-1.5 text-sm">
          <input
            type="checkbox"
            checked={state.inStock}
            onChange={(e) => onChange({ inStock: e.target.checked })}
          />
          In Stock
        </label>
        <label className="flex items-center gap-2 py-1.5 text-sm">
          <input
            type="checkbox"
            checked={state.outOfStock}
            onChange={(e) => onChange({ outOfStock: e.target.checked })}
          />
          Out of Stock
        </label>
      </FilterGroup>

      <FilterGroup title="Service">
        <label className="flex items-center gap-2 py-1.5 text-sm">
          <input
            type="checkbox"
            checked={state.cod}
            onChange={(e) => onChange({ cod: e.target.checked })}
          />
          Cash on Delivery
        </label>
        <label className="flex items-center gap-2 py-1.5 text-sm">
          <input
            type="checkbox"
            checked={state.freeDelivery}
            onChange={(e) => onChange({ freeDelivery: e.target.checked })}
          />
          Free Delivery
        </label>
        <label className="flex items-center gap-2 py-1.5 text-sm">
          <input
            type="checkbox"
            checked={state.warranty}
            onChange={(e) => onChange({ warranty: e.target.checked })}
          />
          Warranty Available
        </label>
      </FilterGroup>

      <FilterGroup title="Promotion">
        <label className="flex items-center gap-2 py-1.5 text-sm">
          <input
            type="checkbox"
            checked={state.onSale}
            onChange={(e) => onChange({ onSale: e.target.checked })}
          />
          On Sale
        </label>
        <label className="flex items-center gap-2 py-1.5 text-sm">
          <input
            type="checkbox"
            checked={state.newArrival}
            onChange={(e) => onChange({ newArrival: e.target.checked })}
          />
          New Arrival
        </label>
        <label className="flex items-center gap-2 py-1.5 text-sm">
          <input
            type="checkbox"
            checked={state.featured}
            onChange={(e) => onChange({ featured: e.target.checked })}
          />
          Featured
        </label>
      </FilterGroup>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details open className="py-4 first:pt-0">
      <summary className="cursor-pointer text-sm font-semibold select-none">{title}</summary>
      <div className="mt-3 flex flex-col gap-0.5">{children}</div>
    </details>
  );
}

function CheckboxRow({
  label,
  count,
  checked,
  onChange,
}: {
  label: string;
  count: number;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const disabled = count === 0 && !checked;
  return (
    <label className={`flex items-center justify-between gap-2 py-1.5 text-sm ${disabled ? "opacity-40" : ""}`}>
      <span className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        {label}
      </span>
      <span className="text-xs text-[var(--muted)]">{count}</span>
    </label>
  );
}
