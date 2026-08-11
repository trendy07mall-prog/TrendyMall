"use client";

import { useRouter } from "next/navigation";
import { filterStateToParams } from "@/lib/product-filters";
import type { ProductFilterState } from "@/lib/product-filters";

// One-tap presets over filters that already exist and are already fully
// wired (Featured/New Arrival flags, the "best-seller" tag, the onSale
// flag, and the price range) -- this component only ever sets fields
// `lib/product-filters.ts` already parses/serializes, it introduces no new
// filter mechanism of its own. Visually solid/filled when active, on
// purpose, to read as "tap to apply" rather than FilterChips.tsx's
// outlined "currently applied, tap to remove" pills right below the
// toolbar -- the two rows serve different purposes and sit in different
// places on the page.
const PRICE_PRESETS: { label: string; minPrice: string; maxPrice: string }[] = [
  { label: "Under Rs 1,000", minPrice: "", maxPrice: "999" },
  { label: "Rs 1,000 – 2,500", minPrice: "1000", maxPrice: "2500" },
  { label: "Rs 2,500 – 5,000", minPrice: "2500", maxPrice: "5000" },
  { label: "Over Rs 5,000", minPrice: "5000", maxPrice: "" },
];

const BEST_SELLER_TAG_SLUG = "best-seller";

export function QuickFilterChips({
  basePath,
  state,
  extraQuery,
}: {
  basePath: string;
  state: ProductFilterState;
  extraQuery?: Record<string, string>;
}) {
  const router = useRouter();

  function apply(next: ProductFilterState) {
    const qs = filterStateToParams(next, extraQuery).toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  }

  const isBestSellerActive = state.tagSlugs.includes(BEST_SELLER_TAG_SLUG);

  function toggleBestSeller() {
    apply({
      ...state,
      tagSlugs: isBestSellerActive
        ? state.tagSlugs.filter((s) => s !== BEST_SELLER_TAG_SLUG)
        : [...state.tagSlugs, BEST_SELLER_TAG_SLUG],
    });
  }

  function toggleFeatured() {
    apply({ ...state, featured: !state.featured });
  }

  function toggleNewArrival() {
    apply({ ...state, newArrival: !state.newArrival });
  }

  function toggleOnSale() {
    apply({ ...state, onSale: !state.onSale });
  }

  function toggleCampaign() {
    apply({ ...state, campaign: !state.campaign });
  }

  function applyPricePreset(preset: (typeof PRICE_PRESETS)[number]) {
    const isActive = state.minPrice === preset.minPrice && state.maxPrice === preset.maxPrice;
    apply({
      ...state,
      minPrice: isActive ? "" : preset.minPrice,
      maxPrice: isActive ? "" : preset.maxPrice,
    });
  }

  const chipClass = (active: boolean) =>
    `shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
      active
        ? "bg-[var(--foreground)] text-white"
        : "border border-[var(--border)] bg-[var(--color-card)] hover:border-[var(--color-warning)]"
    }`;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      <button type="button" onClick={toggleFeatured} className={chipClass(state.featured)}>
        Featured
      </button>
      <button type="button" onClick={toggleNewArrival} className={chipClass(state.newArrival)}>
        New Arrival
      </button>
      <button type="button" onClick={toggleBestSeller} className={chipClass(isBestSellerActive)}>
        Best Seller
      </button>
      <button type="button" onClick={toggleOnSale} className={chipClass(state.onSale)}>
        On Sale
      </button>
      <button type="button" onClick={toggleCampaign} className={chipClass(state.campaign)}>
        On Campaign
      </button>
      {PRICE_PRESETS.map((preset) => (
        <button
          key={preset.label}
          type="button"
          onClick={() => applyPricePreset(preset)}
          className={chipClass(state.minPrice === preset.minPrice && state.maxPrice === preset.maxPrice)}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}
