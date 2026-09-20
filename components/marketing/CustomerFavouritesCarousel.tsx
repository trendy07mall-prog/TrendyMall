"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { FavouriteProductCard } from "@/components/marketing/FavouriteProductCard";
import { FAVOURITES_COPY } from "@/lib/customer-favourites";
import type { FavouritesMode } from "@/lib/customer-favourites";
import type { FavouriteProduct } from "@/lib/data/customer-favourites";

// One scroll-snap track for every breakpoint, exactly as the brief asked:
// mobile is native scrolling with no JS driving it, and the desktop arrows
// and dots are a thin layer on top that calls scrollBy() and reads
// scrollLeft. There is no separate slider implementation and no duplicated
// card markup, so what you swipe on a phone is the same DOM you click
// arrows through on a desktop.

export function CustomerFavouritesCarousel({
  mode,
  products,
}: {
  mode: FavouritesMode;
  products: FavouriteProduct[];
}) {
  const copy = FAVOURITES_COPY[mode];
  const trackRef = useRef<HTMLUListElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [page, setPage] = useState(0);
  const [pageCount, setPageCount] = useState(0);

  // Everything the controls need is derived from the track's own scroll
  // geometry rather than tracked in state, so a swipe, an arrow click and
  // a dot click can never disagree about where the carousel is.
  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const { scrollLeft, scrollWidth, clientWidth } = track;
    const maxScroll = scrollWidth - clientWidth;
    setAtStart(scrollLeft <= 1);
    setAtEnd(scrollLeft >= maxScroll - 1);

    const first = track.firstElementChild as HTMLElement | null;
    if (!first) return;
    const step = first.offsetWidth + gapOf(track);
    if (step <= 0) return;
    // One dot per reachable scroll position, not one per card: the last
    // page shows several cards at once, so there are fewer stops than cards.
    setPageCount(Math.max(1, Math.round(maxScroll / step) + 1));
    setPage(Math.round(scrollLeft / step));
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    measure();
    track.addEventListener("scroll", measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    return () => {
      track.removeEventListener("scroll", measure);
      observer.disconnect();
    };
  }, [measure]);

  function gapOf(track: HTMLElement) {
    return parseFloat(getComputedStyle(track).columnGap || "0") || 0;
  }

  function scrollByCards(direction: 1 | -1) {
    const track = trackRef.current;
    if (!track) return;
    const first = track.firstElementChild as HTMLElement | null;
    if (!first) return;
    track.scrollBy({
      left: direction * (first.offsetWidth + gapOf(track)),
      // Honours prefers-reduced-motion: "auto" lets the OS setting decide,
      // where "smooth" would animate regardless.
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }

  function scrollToPage(index: number) {
    const track = trackRef.current;
    if (!track) return;
    const first = track.firstElementChild as HTMLElement | null;
    if (!first) return;
    track.scrollTo({
      left: index * (first.offsetWidth + gapOf(track)),
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }

  function prefersReducedMotion() {
    return (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  return (
    <section
      aria-roledescription="carousel"
      aria-label={copy.ariaLabel}
      className="mx-auto w-full max-w-[var(--home-container-width)] px-6 pt-7 pb-6 md:pt-[52px] md:pb-10"
    >
      {/* --- header --- */}
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[1.8px] text-[#EA580C] md:text-xs md:tracking-[2px]">
            {copy.eyebrow}
          </p>
          <h2 className="font-heading mt-1 text-2xl font-extrabold tracking-tight text-[#0F2D52] md:text-[30px]">
            {copy.heading}
          </h2>
          <p className="mt-1 hidden text-[15px] text-[#6B7280] md:block">{copy.subtitle}</p>
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          <Link
            href={copy.href}
            className="transition-brand flex min-h-11 items-center gap-1 text-sm font-semibold text-[#0F2D52] hover:text-[#F97316] md:text-[15px]"
          >
            <span className="md:hidden">{copy.linkLabelShort}</span>
            <span className="hidden md:inline">{copy.linkLabel}</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>

          {/* Arrows are a desktop/tablet affordance only -- a phone swipes. */}
          <div className="hidden items-center gap-2.5 md:flex">
            <button
              type="button"
              onClick={() => scrollByCards(-1)}
              disabled={atStart}
              aria-label="Previous products"
              className="transition-brand flex h-11 w-11 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-[#0F2D52] hover:border-[#0F2D52] disabled:opacity-35 disabled:hover:border-[#E5E7EB]"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => scrollByCards(1)}
              disabled={atEnd}
              aria-label="Next products"
              className="transition-brand flex h-11 w-11 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-[#0F2D52] hover:border-[#0F2D52] disabled:opacity-35 disabled:hover:border-[#E5E7EB]"
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* --- track ---
          -mx-6/px-6 on mobile so the first card lines up with the heading
          while the row still bleeds to the screen edge, which is what makes
          the next card peek. no-scrollbar hides the bar without
          disabling the scrolling itself. */}
      <ul
        ref={trackRef}
        className="no-scrollbar -mx-6 mt-[18px] flex snap-x snap-mandatory gap-3 overflow-x-auto px-6 pb-1 md:mx-0 md:mt-7 md:gap-7 md:px-0"
      >
        {products.map((product) => (
          <li
            key={product.id}
            className="w-[min(312px,82vw)] shrink-0 snap-start md:w-[calc((100%-28px)/2)] xl:w-[calc((100%-56px)/3)]"
          >
            <FavouriteProductCard product={product} badge={FAVOURITES_COPY[mode].badge} />
          </li>
        ))}
      </ul>

      {/* --- dots (desktop/tablet) --- */}
      {pageCount > 1 && (
        <div className="mt-5 hidden items-center justify-center gap-1.5 md:flex">
          {Array.from({ length: pageCount }, (_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => scrollToPage(index)}
              aria-label={`Go to slide ${index + 1}`}
              aria-current={index === page}
              className="flex h-6 w-8 items-center justify-center"
            >
              <span
                className={`block h-2 rounded-full transition-all duration-300 ${
                  index === page ? "w-6 bg-[#0F2D52]" : "w-2 bg-[#D1D5DB]"
                }`}
              />
            </button>
          ))}
        </div>
      )}

      {/* --- swipe hint (mobile) --- */}
      <p className="mt-3 text-xs text-[#6B7280] md:hidden">
        <span aria-hidden="true">›</span> Swipe for more {copy.swipeHintSuffix}
      </p>
    </section>
  );
}
