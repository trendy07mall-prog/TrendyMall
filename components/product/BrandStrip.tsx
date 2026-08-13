"use client";

import { useRouter } from "next/navigation";
import { filterStateToParams } from "@/lib/product-filters";
import type { ProductFilterState } from "@/lib/product-filters";

// Same real per-brand facet counts (name + count of matching products)
// FilterGroups.tsx's own Brand section already receives -- reusing that
// exact data rather than the raw brands table, so a brand chip here never
// links to an empty result set. Toggles the same state.brands array the
// sidebar checkboxes already read/write -- one shared piece of state, a
// second entry point, same convention CategoryCarousel.tsx already
// established for category. Hidden below sm: per the mobile decision
// (collapsed, not stacked under the quick-jump nav).
export function BrandStrip({
  basePath,
  state,
  brands,
  extraQuery,
}: {
  basePath: string;
  state: ProductFilterState;
  brands: { name: string; count: number }[];
  extraQuery?: Record<string, string>;
}) {
  const router = useRouter();
  const visible = brands.filter((b) => b.count > 0);
  if (visible.length === 0) return null;

  function toggle(name: string) {
    const active = state.brands.includes(name);
    const next: ProductFilterState = {
      ...state,
      brands: active ? state.brands.filter((b) => b !== name) : [...state.brands, name],
    };
    const qs = filterStateToParams(next, extraQuery).toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  }

  return (
    <div className="hidden gap-2 overflow-x-auto pb-1 sm:flex">
      {visible.map((brand) => {
        const active = state.brands.includes(brand.name);
        return (
          <button
            key={brand.name}
            type="button"
            onClick={() => toggle(brand.name)}
            aria-pressed={active}
            className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
              active
                ? "border-[var(--foreground)] bg-[var(--foreground)] text-white"
                : "border-[var(--border)] bg-[var(--color-card)] hover:border-[var(--color-warning)]"
            }`}
          >
            {brand.name}
          </button>
        );
      })}
    </div>
  );
}
