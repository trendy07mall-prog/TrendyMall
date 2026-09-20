"use client";

import { useRouter } from "next/navigation";
import { CloseIcon } from "@/components/ui/Icon";
import { filterStateToParams } from "@/lib/product-filters";
import type { ProductFilterState } from "@/lib/product-filters";
import { FAVOURITES_COPY } from "@/lib/customer-favourites";
import type { FavouritesMode } from "@/lib/customer-favourites";

// The heading, subtitle and removable chip shown on /shop when a
// ?collection= is active. Its copy comes from the same FAVOURITES_COPY the
// homepage carousel uses, so the shelf a visitor clicked and the page they
// land on always say the same thing.
//
// Removing the chip clears only the collection and keeps every other
// active filter, the same way FilterChips' own pills behave.
export function CollectionHeader({
  mode,
  state,
}: {
  mode: FavouritesMode;
  state: ProductFilterState;
}) {
  const router = useRouter();
  const copy = FAVOURITES_COPY[mode];

  function clearCollection() {
    const next: ProductFilterState = { ...state, collection: null };
    const qs = filterStateToParams(next).toString();
    router.push(qs ? `/shop?${qs}` : "/shop");
  }

  return (
    <header className="mt-6">
      <h1 className="font-heading text-2xl font-bold tracking-tight text-[#0F2D52] md:text-[30px]">
        {copy.heading}
      </h1>
      <p className="mt-1 text-[15px] text-[#6B7280]">{copy.subtitle}</p>
      <button
        type="button"
        onClick={clearCollection}
        aria-label={`Remove the ${copy.heading} filter`}
        className="transition-brand mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[var(--foreground)] bg-[var(--foreground)] px-3.5 py-1.5 text-sm font-medium text-white hover:opacity-85"
      >
        {copy.heading}
        <CloseIcon className="h-3.5 w-3.5" />
      </button>
    </header>
  );
}
