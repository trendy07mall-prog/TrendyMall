"use client";

import Link from "next/link";
import { EMPTY_FILTER_STATE, filterStateToParams } from "@/lib/product-filters";
import type { ProductFilterState } from "@/lib/product-filters";
import { useScrollState } from "@/context/ScrollStateContext";

const BEST_SELLER_TAG_SLUG = "best-seller";

// Plain server-rendered Links (no client JS needed) -- each item applies
// one of the SAME existing filter fields QuickFilterChips.tsx already
// uses (campaign/newArrival/best-seller tag/onSale), or the empty state
// for "All Products". No new filter mechanism, no new route -- this is a
// second entry point onto filters that already exist, same pattern
// CategoryCarousel already establishes for category. "Flash Sale" is
// only included when a campaign is actually active (hasActiveCampaign),
// per the "only real, working filters" requirement.
export function ShopQuickJumpNav({
  state,
  hasActiveCampaign,
  extraQuery,
}: {
  state: ProductFilterState;
  hasActiveCampaign: boolean;
  extraQuery?: Record<string, string>;
}) {
  const isAllActive =
    state.categorySlugs.length === 0 &&
    state.brands.length === 0 &&
    state.tagSlugs.length === 0 &&
    state.attributeValueSlugs.length === 0 &&
    !state.minPrice &&
    !state.maxPrice &&
    !state.minRating &&
    !state.inStock &&
    !state.outOfStock &&
    !state.cod &&
    !state.freeDelivery &&
    !state.warranty &&
    !state.onSale &&
    !state.newArrival &&
    !state.featured &&
    !state.campaign;

  function hrefFor(next: ProductFilterState): string {
    const qs = filterStateToParams(next, extraQuery).toString();
    return qs ? `/shop?${qs}` : "/shop";
  }

  const items: { key: string; label: string; href: string; active: boolean }[] = [
    {
      key: "all",
      label: "All Products",
      href: hrefFor({ ...EMPTY_FILTER_STATE, sort: state.sort }),
      active: isAllActive,
    },
    ...(hasActiveCampaign
      ? [
          {
            key: "campaign",
            label: "Flash Sale",
            href: hrefFor({ ...state, campaign: true }),
            active: state.campaign,
          },
        ]
      : []),
    {
      key: "newArrival",
      label: "New Arrivals",
      href: hrefFor({ ...state, newArrival: true }),
      active: state.newArrival,
    },
    {
      key: "bestSeller",
      label: "Best Sellers",
      href: hrefFor({
        ...state,
        tagSlugs: state.tagSlugs.includes(BEST_SELLER_TAG_SLUG)
          ? state.tagSlugs
          : [...state.tagSlugs, BEST_SELLER_TAG_SLUG],
      }),
      active: state.tagSlugs.includes(BEST_SELLER_TAG_SLUG),
    },
    {
      key: "onSale",
      label: "On Sale",
      href: hrefFor({ ...state, onSale: true }),
      active: state.onSale,
    },
  ];

  // Mobile-only: once the header auto-hides (see NavbarClient.tsx/
  // ScrollStateContext.tsx), the 85px gap this bar normally reserves for
  // it would otherwise sit empty instead of the bar sliding up to meet the
  // viewport top. md:top-[85px] keeps desktop (where the header never
  // hides) exactly as it was.
  const { headerStuck } = useScrollState();

  return (
    // mt-8 lives here (not on a wrapping div in app/shop/page.tsx) --
    // position: sticky is constrained to its immediate parent's box, and a
    // wrapper sized to exactly fit this element gives it zero slack to
    // actually stay pinned while the page scrolls (it "sticks" for a few px
    // then immediately un-sticks). Rendering straight into the page's own
    // (much taller) container gives it real room to remain stuck for the
    // rest of the page. top-[85px] matches NavbarClient's real rendered
    // height (measured 85px at 320/390/1440px -- constant across
    // breakpoints since its py-5 padding dominates over the logo's small
    // sm: size bump) so the nav docks flush under it with no gap or overlap
    // once stuck (or flush under the viewport top once the header itself
    // has auto-hidden on mobile -- see headerStuck above).
    <div
      className={`sticky z-[var(--z-shop-tabs)] mt-8 rounded-[var(--radius-md)] border border-[var(--border)] bg-white/95 backdrop-blur-sm ${
        headerStuck ? "top-0 md:top-[85px]" : "top-[85px]"
      }`}
    >
      <nav aria-label="Jump to section" className="flex gap-1 overflow-x-auto px-2 py-2">
        {items.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            aria-current={item.active ? "true" : undefined}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
              item.active
                ? "bg-[#0F2D52] text-white"
                : "text-[var(--color-text-secondary)] hover:bg-black/5"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
