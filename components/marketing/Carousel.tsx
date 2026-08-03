"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/Icon";

// A generic horizontal carousel used by ServiceCards and the New Arrivals
// section. Deliberately NOT a clone-first/last-slide infinite loop — that
// pattern needs careful aria-live handling so screen readers don't
// re-announce duplicated content on wrap. Instead, "infinite" here means
// wrapping scrollLeft back to 0 (or to the end) when a nav arrow is
// clicked past the last/first page — no DOM node is ever duplicated, so
// there's nothing to over-announce and no aria-live is needed at all.
// Mobile swipe comes free from native scroll-snap; Tab reaches each
// card's own interactive elements in document order, and the browser
// auto-scrolls a focused card into view — no custom keyboard handling
// needed beyond the arrow buttons themselves being focusable.
export function Carousel({
  children,
  itemClassName,
  ariaLabel,
  autoAdvanceMs,
  showArrows = true,
}: {
  children: ReactNode[];
  itemClassName: string;
  ariaLabel: string;
  autoAdvanceMs?: number;
  showArrows?: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [hovering, setHovering] = useState(false);
  const [focused, setFocused] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const paused = hovering || focused || tabHidden;

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReducedMotion(mql.matches);
    function onChange() {
      setReducedMotion(mql.matches);
    }
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    function onVisibilityChange() {
      setTabHidden(document.hidden);
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  function scrollByPage(direction: 1 | -1) {
    const track = trackRef.current;
    if (!track) return;
    const behavior: ScrollBehavior = reducedMotion ? "auto" : "smooth";
    const maxScrollLeft = track.scrollWidth - track.clientWidth;
    const atEnd = direction === 1 && track.scrollLeft >= maxScrollLeft - 4;
    const atStart = direction === -1 && track.scrollLeft <= 4;

    if (atEnd) {
      track.scrollTo({ left: 0, behavior });
    } else if (atStart) {
      track.scrollTo({ left: maxScrollLeft, behavior });
    } else {
      track.scrollBy({ left: direction * track.clientWidth, behavior });
    }
  }

  useEffect(() => {
    if (!autoAdvanceMs || paused || reducedMotion) return;
    const id = setInterval(() => scrollByPage(1), autoAdvanceMs);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAdvanceMs, paused, reducedMotion]);

  return (
    <div
      role="region"
      aria-label={ariaLabel}
      className="group/carousel relative"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      <div
        ref={trackRef}
        className="no-scrollbar flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth"
      >
        {children.map((child, index) => (
          <div key={index} className={`shrink-0 snap-start ${itemClassName}`}>
            {child}
          </div>
        ))}
      </div>

      {showArrows && (
        <>
          {/* 40/46/52px mobile/tablet/desktop — the button element itself is
              sized to each tier (not just the visual circle inside it), so
              the tap target never shrinks below a real 40px on mobile. */}
          <button
            type="button"
            aria-label="Previous"
            onClick={() => scrollByPage(-1)}
            className="absolute top-1/2 left-0 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white shadow-[0_4px_12px_rgba(0,0,0,0.15)] backdrop-blur-sm transition-brand hover:scale-110 sm:h-[46px] sm:w-[46px] lg:h-[52px] lg:w-[52px]"
          >
            <ChevronLeftIcon className="h-[18px] w-[18px] sm:h-5 sm:w-5 lg:h-[22px] lg:w-[22px]" />
          </button>
          <button
            type="button"
            aria-label="Next"
            onClick={() => scrollByPage(1)}
            className="absolute top-1/2 right-0 flex h-10 w-10 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full bg-black/45 text-white shadow-[0_4px_12px_rgba(0,0,0,0.15)] backdrop-blur-sm transition-brand hover:scale-110 sm:h-[46px] sm:w-[46px] lg:h-[52px] lg:w-[52px]"
          >
            <ChevronRightIcon className="h-[18px] w-[18px] sm:h-5 sm:w-5 lg:h-[22px] lg:w-[22px]" />
          </button>
        </>
      )}
    </div>
  );
}
