"use client";

import { useRouter } from "next/navigation";
import { CloseIcon } from "@/components/ui/Icon";
import { EMPTY_FILTER_STATE, filterStateToParams } from "@/lib/product-filters";
import type { ProductFilterState } from "@/lib/product-filters";

interface Chip {
  key: string;
  label: string;
  apply: (state: ProductFilterState) => ProductFilterState;
}

export function FilterChips({
  basePath,
  state,
  categories,
  tags = [],
  attributes = [],
  extraQuery,
  variant = "default",
}: {
  basePath: string;
  state: ProductFilterState;
  categories: { slug: string; name: string }[];
  tags?: { slug: string; name: string }[];
  attributes?: { attributeName: string; attributeSlug: string; values: { name: string; slug: string; count: number }[] }[];
  extraQuery?: Record<string, string>;
  // "shop" opts into the /shop redesign's larger pills + "Field: Value"
  // labels (e.g. "Category: Power Bank") — /category and /search omit
  // this and keep today's plain-value labels/sizing untouched.
  variant?: "default" | "shop";
}) {
  const router = useRouter();
  const isShop = variant === "shop";
  const categoryNameBySlug = new Map(categories.map((c) => [c.slug, c.name]));
  const tagNameBySlug = new Map(tags.map((t) => [t.slug, t.name]));
  const attributeValueNameBySlug = new Map(
    attributes.flatMap((a) => a.values.map((v) => [v.slug, v.name] as const)),
  );

  const chips: Chip[] = [
    ...state.categorySlugs.map((slug) => ({
      key: `category-${slug}`,
      label: `${isShop ? "Category: " : ""}${categoryNameBySlug.get(slug) ?? slug}`,
      apply: (s: ProductFilterState) => ({
        ...s,
        categorySlugs: s.categorySlugs.filter((c) => c !== slug),
      }),
    })),
    ...state.brands.map((brand) => ({
      key: `brand-${brand}`,
      label: `${isShop ? "Brand: " : ""}${brand}`,
      apply: (s: ProductFilterState) => ({ ...s, brands: s.brands.filter((b) => b !== brand) }),
    })),
    ...state.tagSlugs.map((slug) => ({
      key: `tag-${slug}`,
      label: `${isShop ? "Tag: " : ""}${tagNameBySlug.get(slug) ?? slug}`,
      apply: (s: ProductFilterState) => ({ ...s, tagSlugs: s.tagSlugs.filter((t) => t !== slug) }),
    })),
    ...state.attributeValueSlugs.map((slug) => ({
      key: `attr-${slug}`,
      label: attributeValueNameBySlug.get(slug) ?? slug,
      apply: (s: ProductFilterState) => ({
        ...s,
        attributeValueSlugs: s.attributeValueSlugs.filter((v) => v !== slug),
      }),
    })),
    ...(state.minPrice || state.maxPrice
      ? [
          {
            key: "price",
            label: `Price: ${state.minPrice || "0"} – ${state.maxPrice || "Any"}`,
            apply: (s: ProductFilterState) => ({ ...s, minPrice: "", maxPrice: "" }),
          },
        ]
      : []),
    ...(state.minRating
      ? [
          {
            key: "rating",
            label: `${state.minRating}★ & up`,
            apply: (s: ProductFilterState) => ({ ...s, minRating: "" }),
          },
        ]
      : []),
    ...(state.inStock
      ? [{ key: "inStock", label: "In Stock", apply: (s: ProductFilterState) => ({ ...s, inStock: false }) }]
      : []),
    ...(state.outOfStock
      ? [
          {
            key: "outOfStock",
            label: "Out of Stock",
            apply: (s: ProductFilterState) => ({ ...s, outOfStock: false }),
          },
        ]
      : []),
    ...(state.cod
      ? [{ key: "cod", label: "Cash on Delivery", apply: (s: ProductFilterState) => ({ ...s, cod: false }) }]
      : []),
    ...(state.freeDelivery
      ? [
          {
            key: "freeDelivery",
            label: "Free Delivery",
            apply: (s: ProductFilterState) => ({ ...s, freeDelivery: false }),
          },
        ]
      : []),
    ...(state.warranty
      ? [
          {
            key: "warranty",
            label: "Warranty Available",
            apply: (s: ProductFilterState) => ({ ...s, warranty: false }),
          },
        ]
      : []),
    ...(state.onSale
      ? [{ key: "onSale", label: "On Sale", apply: (s: ProductFilterState) => ({ ...s, onSale: false }) }]
      : []),
    ...(state.campaign
      ? [{ key: "campaign", label: "On Campaign", apply: (s: ProductFilterState) => ({ ...s, campaign: false }) }]
      : []),
    ...(state.newArrival
      ? [
          {
            key: "newArrival",
            label: "New Arrival",
            apply: (s: ProductFilterState) => ({ ...s, newArrival: false }),
          },
        ]
      : []),
    ...(state.featured
      ? [{ key: "featured", label: "Featured", apply: (s: ProductFilterState) => ({ ...s, featured: false }) }]
      : []),
  ];

  if (chips.length === 0) return null;

  function go(next: ProductFilterState) {
    const qs = filterStateToParams(next, extraQuery).toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  }

  return (
    <div
      className={`flex flex-wrap items-center gap-2 ${
        isShop ? "rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--color-card)] p-3" : ""
      }`}
    >
      {isShop && (
        <span className="pr-1 text-xs font-semibold tracking-wide text-[var(--color-text-secondary)] uppercase">
          Filters:
        </span>
      )}
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={() => go(chip.apply(state))}
          className={
            isShop
              ? "flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--background)] px-3.5 py-2 text-sm font-medium transition-colors hover:border-[var(--color-warning)] hover:bg-black/5"
              : "flex items-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-1.5 text-xs transition-colors hover:bg-black/5"
          }
        >
          {chip.label}
          <CloseIcon className={isShop ? "h-3.5 w-3.5" : "h-3 w-3"} />
        </button>
      ))}
      <button
        type="button"
        onClick={() => go({ ...EMPTY_FILTER_STATE, sort: state.sort })}
        className={
          isShop
            ? "text-sm font-semibold text-[var(--color-warning)] hover:underline"
            : "text-xs text-[var(--muted)] underline"
        }
      >
        Clear all
      </button>
    </div>
  );
}
