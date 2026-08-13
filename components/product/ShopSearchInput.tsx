"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon, CloseIcon } from "@/components/ui/Icon";
import { filterStateToParams } from "@/lib/product-filters";
import type { ProductFilterState } from "@/lib/product-filters";

// Reuses the existing `q` mechanism /search already established
// (getSearchMatchIds/searchProducts in lib/data/products.ts, threaded
// through app/shop/page.tsx as extraQuery={{q}} to every other control on
// this page) -- this input only ever sets/clears that one param via the
// same filterStateToParams serialization every other toolbar control
// already uses, no new filtering mechanism. Styled after
// components/layout/SearchBox.tsx's compact pill convention (left icon,
// focus-within ring on the wrapper, not the input).
export function ShopSearchInput({
  basePath,
  state,
  initialQuery,
}: {
  basePath: string;
  state: ProductFilterState;
  initialQuery: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);

  function go(q: string) {
    const trimmed = q.trim();
    const qs = filterStateToParams(state, trimmed ? { q: trimmed } : undefined).toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    go(value);
  }

  function clear() {
    setValue("");
    go("");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full border border-[var(--border)] bg-white px-3 transition-[border-color,box-shadow] duration-200 ease-in-out focus-within:border-[var(--foreground)] focus-within:ring-4 focus-within:ring-[rgba(0,0,0,0.08)] sm:max-w-64"
    >
      <SearchIcon className="h-4 w-4 shrink-0 text-[var(--muted)]" />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search in results…"
        aria-label="Search within results"
        className="min-w-0 flex-1 border-none bg-transparent text-sm outline-none placeholder:text-[var(--muted)]"
      />
      {value && (
        <button
          type="button"
          onClick={clear}
          aria-label="Clear search"
          className="shrink-0 text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          <CloseIcon className="h-3.5 w-3.5" />
        </button>
      )}
    </form>
  );
}
