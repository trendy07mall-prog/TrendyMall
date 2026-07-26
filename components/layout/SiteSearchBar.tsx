"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getSearchSuggestions } from "@/lib/search";
import type { SearchSuggestions } from "@/lib/search";
import { SearchIcon } from "@/components/ui/Icon";
import { formatPrice } from "@/lib/utils";

const RECENT_SEARCHES_KEY = "trendymall-recent-searches";
const MAX_RECENT = 5;
const EMPTY_SUGGESTIONS: SearchSuggestions = { products: [], categories: [], brands: [] };

// Tab can reach these buttons independently of the arrow-key `activeIndex`
// highlight below, so they need their own visible (keyboard-only) focus
// ring — matches their existing rounded-lg, no shape mismatch.
const LISTBOX_ITEM_FOCUS =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--foreground)] focus-visible:ring-offset-1";

function readRecentSearches(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_SEARCHES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(query: string) {
  try {
    const existing = readRecentSearches().filter((q) => q.toLowerCase() !== query.toLowerCase());
    window.localStorage.setItem(
      RECENT_SEARCHES_KEY,
      JSON.stringify([query, ...existing].slice(0, MAX_RECENT)),
    );
  } catch {
    // ignore — recent searches are a nice-to-have, not critical
  }
}

type FlatItem =
  | { type: "recent"; value: string }
  | { type: "product"; value: SearchSuggestions["products"][number] }
  | { type: "category"; value: SearchSuggestions["categories"][number] }
  | { type: "brand"; value: string };

export function SiteSearchBar() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestions>(EMPTY_SUGGESTIONS);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    // Reading localStorage only after mount (not in useState's initializer)
    // is intentional: it keeps the server-rendered and first client render
    // identical, avoiding a hydration mismatch — same pattern as CartContext.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecentSearches(readRecentSearches());
  }, []);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      // Clearing stale suggestions as the query shrinks below the minimum
      // is part of the same query->suggestions sync this whole effect
      // exists for (the fetch below can't run synchronously in render).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSuggestions(EMPTY_SUGGESTIONS);
      return;
    }
    setLoading(true);
    const timer = setTimeout(() => {
      getSearchSuggestions(trimmed).then((result) => {
        setSuggestions(result);
        setLoading(false);
        setActiveIndex(-1);
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const showRecent = query.trim().length < 2;
  const items: FlatItem[] = showRecent
    ? recentSearches.map((value) => ({ type: "recent" as const, value }))
    : [
        ...suggestions.products.map((value) => ({ type: "product" as const, value })),
        ...suggestions.categories.map((value) => ({ type: "category" as const, value })),
        ...suggestions.brands.map((value) => ({ type: "brand" as const, value })),
      ];

  function goToSearch(q: string) {
    const trimmed = q.trim();
    if (!trimmed) return;
    saveRecentSearch(trimmed);
    setRecentSearches(readRecentSearches());
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  function selectItem(item: FlatItem) {
    if (item.type === "recent") {
      setQuery(item.value);
      goToSearch(item.value);
    } else if (item.type === "product") {
      setOpen(false);
      router.push(`/product/${item.value.slug}`);
    } else if (item.type === "category") {
      setOpen(false);
      router.push(`/category/${item.value.slug}`);
    } else {
      setOpen(false);
      router.push(`/shop?brand=${encodeURIComponent(item.value)}`);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((i) => Math.min(i + 1, items.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (event.key === "Enter") {
      if (activeIndex >= 0 && items[activeIndex]) {
        event.preventDefault();
        selectItem(items[activeIndex]);
      }
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative mx-auto w-[95%] sm:w-[65%]">
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          goToSearch(query);
        }}
        className="flex h-12 items-center rounded-[30px] border border-[var(--border)] bg-white pl-5 shadow-sm transition-all duration-200 focus-within:border-[var(--foreground)] focus-within:ring-4 focus-within:ring-[var(--foreground)]/10"
      >
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search for products, brands, categories…"
          aria-label="Search products"
          role="combobox"
          aria-expanded={open}
          aria-controls="site-search-listbox"
          autoComplete="off"
          // The focus ring lives on the wrapper (focus-within above) so it
          // follows the pill shape — `appearance-none` is required here on
          // top of `outline-none` because type="search" gets its own native
          // "searchfield" rendering in WebKit/Blink that ignores plain
          // `outline: none`.
          className="h-full flex-1 appearance-none border-none bg-transparent text-sm outline-none placeholder:text-[var(--muted)] focus:outline-none focus:ring-0"
        />
        <button
          type="submit"
          aria-label="Search"
          className="ml-2 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--foreground)] text-white"
        >
          <SearchIcon className="h-4 w-4" />
        </button>
      </form>

      {open && (
        <div
          id="site-search-listbox"
          role="listbox"
          className="absolute top-full right-0 left-0 z-40 mt-2 max-h-[70vh] overflow-y-auto rounded-[var(--radius-md)] border border-[var(--border)] bg-white p-2 shadow-lg"
        >
          {showRecent ? (
            recentSearches.length > 0 ? (
              <>
                <p className="px-2 py-1 text-xs font-medium tracking-wide text-[var(--muted)] uppercase">
                  Recent searches
                </p>
                {recentSearches.map((term, i) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => selectItem({ type: "recent", value: term })}
                    className={`block w-full rounded-lg px-2 py-2 text-left text-sm ${LISTBOX_ITEM_FOCUS} ${
                      activeIndex === i ? "bg-black/5" : "hover:bg-black/5"
                    }`}
                  >
                    {term}
                  </button>
                ))}
              </>
            ) : (
              <p className="px-2 py-4 text-center text-sm text-[var(--muted)]">
                Start typing to search products, brands, and categories.
              </p>
            )
          ) : loading ? (
            <p className="px-2 py-4 text-center text-sm text-[var(--muted)]">Searching…</p>
          ) : items.length === 0 ? (
            <div className="px-2 py-4 text-center text-sm text-[var(--muted)]">
              <p>No products found.</p>
              <Link
                href="/shop"
                className="mt-2 inline-block underline"
                onClick={() => setOpen(false)}
              >
                Browse all products
              </Link>
            </div>
          ) : (
            <>
              {suggestions.products.length > 0 && (
                <div>
                  <p className="px-2 py-1 text-xs font-medium tracking-wide text-[var(--muted)] uppercase">
                    Products
                  </p>
                  {suggestions.products.map((product, i) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => selectItem({ type: "product", value: product })}
                      className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left ${LISTBOX_ITEM_FOCUS} ${
                        activeIndex === i ? "bg-black/5" : "hover:bg-black/5"
                      }`}
                    >
                      <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-black/5">
                        {product.image && (
                          <Image src={product.image} alt="" fill sizes="40px" className="object-cover" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">{product.name}</span>
                        <span className="block text-xs text-[var(--muted)]">
                          {formatPrice(product.price)}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {(suggestions.categories.length > 0 || suggestions.brands.length > 0) && (
                <div className="mt-2 border-t border-[var(--border)] pt-2">
                  {suggestions.categories.map((category, i) => {
                    const index = suggestions.products.length + i;
                    return (
                      <button
                        key={category.slug}
                        type="button"
                        onClick={() => selectItem({ type: "category", value: category })}
                        className={`block w-full rounded-lg px-2 py-2 text-left text-sm ${LISTBOX_ITEM_FOCUS} ${
                          activeIndex === index ? "bg-black/5" : "hover:bg-black/5"
                        }`}
                      >
                        In <strong>{category.name}</strong>
                      </button>
                    );
                  })}
                  {suggestions.brands.map((brand, i) => {
                    const index = suggestions.products.length + suggestions.categories.length + i;
                    return (
                      <button
                        key={brand}
                        type="button"
                        onClick={() => selectItem({ type: "brand", value: brand })}
                        className={`block w-full rounded-lg px-2 py-2 text-left text-sm ${LISTBOX_ITEM_FOCUS} ${
                          activeIndex === index ? "bg-black/5" : "hover:bg-black/5"
                        }`}
                      >
                        Brand: <strong>{brand}</strong>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
