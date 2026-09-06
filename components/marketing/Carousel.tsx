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

  // An empty snap-x/overflow-x-auto track (no callers currently hit this,
  // but nothing stops a future one) reliably crashes WebKit's renderer --
  // confirmed via repeated Playwright WebKit trials isolating this exact
  // markup shape with zero children. There's nothing to carousel through
  // anyway, so bail out after the hooks above have run unconditionally.
  if (children.length === 0) return null;

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
          {/* Fixed 40px at every breakpoint, deliberately not scaling up on
              sm:/lg: -- this used to grow to 46/52px (then 48/56px) via
              responsive size overrides, but any responsive height/width
              override on this button reliably crashed WebKit's renderer
              once a carousel had >5 items (confirmed via repeated WebKit
              trials: transform + rounded-full + a responsive size change on
              this absolutely-positioned button reproduced the crash even
              with every other class -- shadow, blur, color -- stripped
              out; the same button pinned to one size across all
              breakpoints never crashed once). Losing the tablet/desktop
              size bump is the tradeoff for a homepage that doesn't crash
              Safari/WebKit visitors. */}
          <button
            type="button"
            aria-label="Previous"
            onClick={() => scrollByPage(-1)}
            className="absolute top-1/2 left-0 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white shadow-[0_4px_12px_rgba(0,0,0,0.15)] backdrop-blur-sm transition-brand hover:scale-110"
          >
            <ChevronLeftIcon className="h-[18px] w-[18px]" />
          </button>
          <button
            type="button"
            aria-label="Next"
            onClick={() => scrollByPage(1)}
            className="absolute top-1/2 right-0 flex h-10 w-10 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full bg-black/45 text-white shadow-[0_4px_12px_rgba(0,0,0,0.15)] backdrop-blur-sm transition-brand hover:scale-110"
          >
            <ChevronRightIcon className="h-[18px] w-[18px]" />
          </button>
        </>
      )}
    </div>
  );
}
