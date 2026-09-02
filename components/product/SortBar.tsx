"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDownIcon, CheckIcon } from "@/components/ui/Icon";
import { SORT_LABELS, filterStateToParams } from "@/lib/product-filters";
import type { ProductFilterState, SortOption } from "@/lib/product-filters";

// Custom listbox-button dropdown replacing the native <select> this used to
// render -- same sort options, same underlying router.push navigation, same
// keyboard support a native <select> gives for free (arrow keys, Home/End,
// Enter/Space to choose, Escape to dismiss), just styled to match the rest
// of the site instead of the browser's own unstyled control. Follows the
// WAI-ARIA "Collapsible Dropdown Listbox" pattern: a button with
// aria-haspopup="listbox"/aria-expanded, and a role="listbox" panel whose
// role="option" rows carry real DOM focus (roving tabindex) rather than
// aria-activedescendant -- simpler to get right, and still fully consistent
// with what a screen reader announces for a single-select listbox.
function SortDropdown({
  state,
  options,
  onSelect,
  sizeVariant,
}: {
  state: ProductFilterState;
  options: SortOption[];
  onSelect: (sort: SortOption) => void;
  sizeVariant: "default" | "shop";
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef(new Map<SortOption, HTMLLIElement>());

  // Outside click closes without changing the selection -- mousedown (not
  // click) so it fires before a click on the trigger itself would otherwise
  // immediately reopen what this just closed.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  // Opening lands focus on the currently-selected option (falling back to
  // the first row if the selected one somehow isn't in this options list,
  // e.g. "Highest Rated" hidden when there are no reviews yet) -- the same
  // "open a menu, land on the live choice" behavior a native <select>
  // gives for free.
  useEffect(() => {
    if (!open) return;
    const target = optionRefs.current.get(state.sort) ?? optionRefs.current.get(options[0]);
    target?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function selectSort(sort: SortOption) {
    setOpen(false);
    // onSelect (router.push) runs BEFORE the imperative focus restore below
    // -- reversed, the push was silently swallowed (confirmed by direct
    // testing against this Next.js build): moving DOM focus first appears
    // to race Next's own post-navigation focus/scroll-restoration handling
    // for the same click event. Kicking off the navigation first, then
    // restoring focus to the trigger afterward, avoids that entirely and
    // still gives keyboard users their focus back in the same place a
    // native <select> would leave it.
    onSelect(sort);
    triggerRef.current?.focus();
  }

  function focusOptionAt(index: number) {
    const clamped = Math.max(0, Math.min(index, options.length - 1));
    optionRefs.current.get(options[clamped])?.focus();
  }

  function handleOptionKeyDown(event: React.KeyboardEvent<HTMLLIElement>, index: number) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        focusOptionAt(index + 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        focusOptionAt(index - 1);
        break;
      case "Home":
        event.preventDefault();
        focusOptionAt(0);
        break;
      case "End":
        event.preventDefault();
        focusOptionAt(options.length - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        selectSort(options[index]);
        break;
      case "Escape":
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
        break;
      case "Tab":
        // Let focus leave naturally (don't trap it) -- just close so a
        // stray open panel doesn't linger once the user has moved on.
        setOpen(false);
        break;
    }
  }

  const isShop = sizeVariant === "shop";

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Sort products, currently ${SORT_LABELS[state.sort]}`}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(event) => {
          if (open) return;
          if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className={`transition-brand flex items-center gap-2 rounded-[var(--radius-input)] border border-[var(--border)] bg-[var(--color-card)] pr-3 pl-3.5 shadow-[var(--shadow-card-hover)] hover:border-[var(--border-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--foreground)] ${
          isShop ? "py-2.5 text-[15px]" : "py-2 text-sm"
        }`}
      >
        <span className="text-[var(--color-text-secondary)]">Sort:</span>
        <span className="font-semibold">{SORT_LABELS[state.sort]}</span>
        <ChevronDownIcon
          className={`h-3.5 w-3.5 shrink-0 text-[var(--color-text-secondary)] transition-transform duration-150 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Sort products"
          className="absolute top-full right-0 z-10 mt-2 min-w-[220px] rounded-[var(--radius-btn)] bg-[var(--color-card)] p-1.5 shadow-[0_10px_40px_rgba(0,0,0,0.12)] focus:outline-none"
        >
          {options.map((option, index) => {
            const selected = option === state.sort;
            return (
              <li
                key={option}
                ref={(el) => {
                  if (el) optionRefs.current.set(option, el);
                  else optionRefs.current.delete(option);
                }}
                role="option"
                aria-selected={selected}
                tabIndex={-1}
                onClick={() => selectSort(option)}
                onKeyDown={(event) => handleOptionKeyDown(event, index)}
                className={`transition-brand flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-[var(--radius-sm)] px-3.5 py-3 text-sm focus:outline-none ${
                  selected
                    ? "bg-[var(--color-warning)]/10 font-medium text-[var(--color-warning)]"
                    : "text-[var(--foreground)] hover:bg-black/5"
                }`}
              >
                {SORT_LABELS[option]}
                {selected && <CheckIcon className="h-4 w-4 shrink-0" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function SortBar({
  basePath,
  state,
  resultCount,
  totalCount,
  showHighestRated,
  extraQuery,
  viewToggle,
  searchInput,
  variant = "default",
}: {
  basePath: string;
  state: ProductFilterState;
  resultCount: number;
  totalCount: number;
  showHighestRated: boolean;
  extraQuery?: Record<string, string>;
  viewToggle?: React.ReactNode;
  // Optional left-hand toolbar slot (ShopSearchInput) -- only ever passed
  // from app/shop/page.tsx, so /category and /search render exactly as
  // before (undefined here changes nothing about their layout).
  searchInput?: React.ReactNode;
  // "shop" opts into the /shop redesign's toolbar shell + "{count}
  // Products" wording — shared by /category and /search too, which omit
  // this and keep today's "Showing X of Y product(s)" text/appearance.
  variant?: "default" | "shop";
}) {
  const router = useRouter();
  const isShop = variant === "shop";

  const options = (Object.keys(SORT_LABELS) as SortOption[]).filter(
    (option) => option !== "highest_rated" || showHighestRated,
  );

  function setSort(sort: SortOption) {
    const qs = filterStateToParams({ ...state, sort }, extraQuery).toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  }

  return (
    <div
      className={`hidden items-center justify-between sm:flex ${
        isShop ? "gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--color-card)] p-4" : ""
      }`}
    >
      {/* "shop" drops the product-count text entirely per the compact
          redesign -- the /category and /search default variant keeps its
          "Showing X of Y product(s)" text unchanged. searchInput (shop
          only) takes that same left-hand slot instead when present. */}
      {isShop ? searchInput : (
        <p className="text-sm text-[var(--muted)]">
          Showing {resultCount} of {totalCount} product{totalCount === 1 ? "" : "s"}
        </p>
      )}
      <div className="flex items-center gap-3">
        {viewToggle}
        <SortDropdown state={state} options={options} onSelect={setSort} sizeVariant={variant} />
      </div>
    </div>
  );
}
