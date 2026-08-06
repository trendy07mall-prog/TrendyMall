"use client";

import { useState } from "react";
import { StarRating } from "@/components/product/StarRating";
import { PriceRangeSlider } from "@/components/product/PriceRangeSlider";
import { ChevronDownIcon, CheckIcon } from "@/components/ui/Icon";
import type { ProductFilterState } from "@/lib/product-filters";

const PRICE_DOMAIN_MAX = 50000;

const inputClass =
  "w-full min-w-0 rounded-[var(--radius-input)] border border-[var(--border)] bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]";

interface CategoryFacet {
  slug: string;
  name: string;
  count: number;
  depth: number;
}

interface BrandFacet {
  name: string;
  count: number;
}

interface TagFacet {
  slug: string;
  name: string;
  count: number;
}

interface AttributeFacet {
  attributeName: string;
  attributeSlug: string;
  values: { name: string; slug: string; count: number }[];
}

export function FilterGroups({
  state,
  onChange,
  categories,
  brands,
  tags,
  attributes,
  showCategoryFacet,
  showRatingFacet,
  variant = "default",
}: {
  state: ProductFilterState;
  onChange: (next: Partial<ProductFilterState>) => void;
  categories: CategoryFacet[];
  brands: BrandFacet[];
  tags: TagFacet[];
  attributes: AttributeFacet[];
  showCategoryFacet: boolean;
  showRatingFacet: boolean;
  // "shop" opts into the /shop redesign's slightly larger checkboxes/rows —
  // this component is also shared by /category and /search, which omit
  // this and keep today's sizing untouched.
  variant?: "default" | "shop";
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
              indent={category.depth}
              checked={state.categorySlugs.includes(category.slug)}
              variant={variant}
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
              variant={variant}
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

      {tags.length > 0 && (
        <FilterGroup title="Tags">
          {tags.map((tag) => (
            <CheckboxRow
              key={tag.slug}
              label={tag.name}
              count={tag.count}
              checked={state.tagSlugs.includes(tag.slug)}
              variant={variant}
              onChange={(checked) =>
                onChange({
                  tagSlugs: checked
                    ? [...state.tagSlugs, tag.slug]
                    : state.tagSlugs.filter((s) => s !== tag.slug),
                })
              }
            />
          ))}
        </FilterGroup>
      )}

      {attributes.map((attribute) => (
        <FilterGroup key={attribute.attributeSlug} title={attribute.attributeName}>
          {attribute.values.map((value) => (
            <CheckboxRow
              key={value.slug}
              label={value.name}
              count={value.count}
              checked={state.attributeValueSlugs.includes(value.slug)}
              variant={variant}
              onChange={(checked) =>
                onChange({
                  attributeValueSlugs: checked
                    ? [...state.attributeValueSlugs, value.slug]
                    : state.attributeValueSlugs.filter((s) => s !== value.slug),
                })
              }
            />
          ))}
        </FilterGroup>
      ))}

      <FilterGroup title="Price (LKR)">
        <PriceRangeSlider
          min={state.minPrice ? Number(state.minPrice) : 0}
          max={state.maxPrice ? Number(state.maxPrice) : PRICE_DOMAIN_MAX}
          domainMax={PRICE_DOMAIN_MAX}
          onCommit={(min, max) =>
            onChange({
              minPrice: min > 0 ? String(min) : "",
              maxPrice: max < PRICE_DOMAIN_MAX ? String(max) : "",
            })
          }
        />
        <div className="mt-4 flex items-center gap-2">
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
      </FilterGroup>

      {showRatingFacet && (
        <FilterGroup title="Rating">
          {[4, 3, 2].map((threshold) => (
            <label key={threshold} className="flex items-center gap-2 py-1.5 text-sm">
              <Radio
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
          <Checkbox
            checked={state.inStock}
            variant={variant}
            onChange={(checked) => onChange({ inStock: checked })}
          />
          In Stock
        </label>
        <label className="flex items-center gap-2 py-1.5 text-sm">
          <Checkbox
            checked={state.outOfStock}
            variant={variant}
            onChange={(checked) => onChange({ outOfStock: checked })}
          />
          Out of Stock
        </label>
      </FilterGroup>

      <FilterGroup title="Service">
        <label className="flex items-center gap-2 py-1.5 text-sm">
          <Checkbox checked={state.cod} variant={variant} onChange={(checked) => onChange({ cod: checked })} />
          Cash on Delivery
        </label>
        <label className="flex items-center gap-2 py-1.5 text-sm">
          <Checkbox
            checked={state.freeDelivery}
            variant={variant}
            onChange={(checked) => onChange({ freeDelivery: checked })}
          />
          Free Delivery
        </label>
        <label className="flex items-center gap-2 py-1.5 text-sm">
          <Checkbox
            checked={state.warranty}
            variant={variant}
            onChange={(checked) => onChange({ warranty: checked })}
          />
          Warranty Available
        </label>
      </FilterGroup>

      <FilterGroup title="Promotion">
        <label className="flex items-center gap-2 py-1.5 text-sm">
          <Checkbox checked={state.onSale} variant={variant} onChange={(checked) => onChange({ onSale: checked })} />
          On Sale
        </label>
        <label className="flex items-center gap-2 py-1.5 text-sm">
          <Checkbox
            checked={state.newArrival}
            variant={variant}
            onChange={(checked) => onChange({ newArrival: checked })}
          />
          New Arrival
        </label>
        <label className="flex items-center gap-2 py-1.5 text-sm">
          <Checkbox
            checked={state.featured}
            variant={variant}
            onChange={(checked) => onChange({ featured: checked })}
          />
          Featured
        </label>
      </FilterGroup>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="py-4 first:pt-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between text-sm font-semibold"
      >
        {title}
        <ChevronDownIcon
          className={`transition-brand h-4 w-4 text-[var(--muted)] ${open ? "rotate-180" : ""}`}
        />
      </button>
      <div className={`transition-brand grid ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="flex flex-col gap-0.5 overflow-hidden">
          <div className="mt-3">{children}</div>
        </div>
      </div>
    </div>
  );
}

function Checkbox({
  checked,
  onChange,
  disabled,
  variant = "default",
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  variant?: "default" | "shop";
}) {
  const size = variant === "shop" ? "h-[18px] w-[18px]" : "h-4 w-4";
  return (
    <span className={`relative flex shrink-0 items-center justify-center ${size}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className={`peer absolute inset-0 cursor-pointer appearance-none border border-[var(--border)] checked:border-[var(--foreground)] checked:bg-[var(--foreground)] disabled:cursor-not-allowed ${size} ${
          variant === "shop" ? "rounded-[5px]" : "rounded-[4px]"
        }`}
      />
      <CheckIcon className="pointer-events-none absolute hidden h-3 w-3 text-white peer-checked:block" />
    </span>
  );
}

function Radio({
  name,
  checked,
  onChange,
}: {
  name: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <span className="relative flex h-4 w-4 shrink-0 items-center justify-center">
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className="peer absolute inset-0 h-4 w-4 cursor-pointer appearance-none rounded-full border border-[var(--border)] checked:border-[var(--foreground)]"
      />
      <span className="pointer-events-none absolute hidden h-2 w-2 rounded-full bg-[var(--foreground)] peer-checked:block" />
    </span>
  );
}

function CheckboxRow({
  label,
  count,
  checked,
  onChange,
  indent = 0,
  variant = "default",
}: {
  label: string;
  count: number;
  checked: boolean;
  onChange: (checked: boolean) => void;
  // Nested category depth -- 0 for a top-level category/every other
  // facet type, which don't pass this at all.
  indent?: number;
  variant?: "default" | "shop";
}) {
  const disabled = count === 0 && !checked;
  return (
    <label
      style={indent > 0 ? { marginLeft: indent * 12 } : undefined}
      className={`flex items-center justify-between gap-2 text-sm ${disabled ? "opacity-40" : ""} ${
        variant === "shop" ? "py-2" : "py-1.5"
      }`}
    >
      <span className="flex items-center gap-2">
        <Checkbox checked={checked} disabled={disabled} onChange={onChange} variant={variant} />
        {label}
      </span>
      <span
        className={`text-xs text-[var(--muted)] ${
          variant === "shop" ? "rounded-full bg-[var(--background)] px-1.5 py-0.5" : ""
        }`}
      >
        {count}
      </span>
    </label>
  );
}
