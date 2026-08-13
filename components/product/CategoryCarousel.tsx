"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { filterStateToParams } from "@/lib/product-filters";
import type { ProductFilterState } from "@/lib/product-filters";
import type { Category } from "@/types";

// A second, visually distinct row of quick filters alongside
// QuickFilterChips.tsx's tag pills (Featured/Best Seller/On Sale/New
// Arrival) -- this one filters by CATEGORY instead of tag, and reuses the
// exact same categorySlugs array the filter sidebar's checkboxes already
// read/write, so clicking a tile here and checking the matching sidebar
// box always agree (one shared piece of state, two entry points, not two
// competing filter mechanisms). `categories` (name/slug/image_path) and
// `counts` (real per-category product counts, already computed for the
// sidebar's own facet display) are joined here by slug and filtered to
// count > 0, since the categories table has many more rows than the ones
// any of today's real products actually belong to.
export function CategoryCarousel({
  basePath,
  state,
  categories,
  counts,
  extraQuery,
}: {
  basePath: string;
  state: ProductFilterState;
  categories: Category[];
  counts: { slug: string; count: number }[];
  extraQuery?: Record<string, string>;
}) {
  const router = useRouter();
  const countBySlug = new Map(counts.map((c) => [c.slug, c.count] as const));
  const visible = categories.filter((c) => (countBySlug.get(c.slug) ?? 0) > 0);

  if (visible.length === 0) return null;

  function toggle(slug: string) {
    const active = state.categorySlugs.includes(slug);
    const next: ProductFilterState = {
      ...state,
      categorySlugs: active
        ? state.categorySlugs.filter((s) => s !== slug)
        : [...state.categorySlugs, slug],
    };
    const qs = filterStateToParams(next, extraQuery).toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-1">
      {visible.map((category) => {
        const active = state.categorySlugs.includes(category.slug);
        return (
          <button
            key={category.slug}
            type="button"
            onClick={() => toggle(category.slug)}
            aria-pressed={active}
            className="flex w-20 shrink-0 flex-col items-center gap-2 text-center"
          >
            <span
              className={`relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 transition-colors ${
                active
                  ? "border-[#0F2D52] bg-[#0F2D52]"
                  : "border-transparent bg-[#0F2D52]/8 hover:border-[var(--color-warning)]"
              }`}
            >
              {category.image_path ? (
                <Image
                  src={category.image_path}
                  alt=""
                  fill
                  loading="lazy"
                  sizes="64px"
                  className="object-cover"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className={`text-lg font-bold ${active ? "text-white/70" : "text-[#0F2D52]/40"}`}
                >
                  {category.name.charAt(0)}
                </span>
              )}
            </span>
            <span
              className={`line-clamp-2 text-xs leading-tight font-semibold ${
                active ? "text-[#0F2D52]" : "text-[var(--foreground)]"
              }`}
            >
              {category.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
