"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/Icon";

interface Slide {
  src: string;
  alt: string;
  href: string;
  blurDataURL: string;
}

const SLIDES: Slide[] = [
  {
    src: "/images/hero/hero-1.jpg",
    alt: "TrendyMall — Sri Lanka's online shop for mobile phone accessories",
    href: "/shop",
    blurDataURL:
      "data:image/jpeg;base64,/9j/2wBDABQODxIPDRQSEBIXFRQYHjIhHhwcHj0sLiQySUBMS0dARkVQWnNiUFVtVkVGZIhlbXd7gYKBTmCNl4x9lnN+gXz/2wBDARUXFx4aHjshITt8U0ZTfHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHz/wAARCAAFABADASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAQG/8QAHRAAAgMAAgMAAAAAAAAAAAAAAQIAAxEFEjEy0f/EABQBAQAAAAAAAAAAAAAAAAAAAAL/xAAWEQEBAQAAAAAAAAAAAAAAAAAAQQH/2gAMAwEAAhEDEQA/AM1acSvc9QfErutrfi1RKQnVydB3SfmREcwa/9k=",
  },
  {
    src: "/images/hero/hero-2.jpg",
    alt: "Get 5% off your order — limited-time discount, use code 1ST ORDER",
    href: "/coupons",
    blurDataURL:
      "data:image/jpeg;base64,/9j/2wBDABQODxIPDRQSEBIXFRQYHjIhHhwcHj0sLiQySUBMS0dARkVQWnNiUFVtVkVGZIhlbXd7gYKBTmCNl4x9lnN+gXz/2wBDARUXFx4aHjshITt8U0ZTfHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHz/wAARCAAIABADASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAEF/8QAHBAAAgMBAAMAAAAAAAAAAAAAAQIAAxEEEzGh/8QAFQEBAQAAAAAAAAAAAAAAAAAABAX/xAAWEQEBAQAAAAAAAAAAAAAAAAAAEUH/2gAMAwEAAhEDEQA/AM/iZV02Vl1zAAZOzxsWesGvfSEE/YiEX7r/2Q==",
  },
  {
    src: "/images/hero/hero-3.jpg",
    alt: "TrendyMall islandwide delivery",
    href: "/shop",
    blurDataURL:
      "data:image/jpeg;base64,/9j/2wBDABQODxIPDRQSEBIXFRQYHjIhHhwcHj0sLiQySUBMS0dARkVQWnNiUFVtVkVGZIhlbXd7gYKBTmCNl4x9lnN+gXz/2wBDARUXFx4aHjshITt8U0ZTfHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHz/wAARCAAIABADASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAMF/8QAIRAAAgIBAgcAAAAAAAAAAAAAAQIAAwQRIRITIkJRYXH/xAAUAQEAAAAAAAAAAAAAAAAAAAAD/8QAGREAAwADAAAAAAAAAAAAAAAAAAERAhIy/9oADAMBAAIRAxEAPwDbdso5QelFNO3cOr3KG+1bnLo/K4goJ02Hn5EQeoI8daz/2Q==",
  },
];

// Fade-only per this project's hero spec — no zoom, scale, parallax, or
// bounce. Kept shorter than the old Ken-Burns build's transition so the
// crossfade still feels snappy at this shorter 4s interval.
const SLIDE_DURATION = 4000; // ms each slide is visible
const TRANSITION_DURATION = 600; // ms crossfade transition

export function HeroSlider() {
  const [active, setActive] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [focused, setFocused] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const paused = hovering || focused || tabHidden;
  const touchStartX = useRef<number | null>(null);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    // Reading the OS/browser's current preference on mount is the same
    // "sync from an external system" pattern as CartContext's localStorage
    // read — it can't be known during server render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReducedMotion(mql.matches);
    function onChange() {
      setReducedMotion(mql.matches);
    }
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  const goTo = useCallback((targetIndex: number) => {
    setActive(((targetIndex % SLIDES.length) + SLIDES.length) % SLIDES.length);
  }, []);

  function next() {
    goTo(active + 1);
  }

  function prev() {
    goTo(active - 1);
  }

  // Reruns (tearing down + restarting the interval) whenever `active`
  // changes for ANY reason — automatic tick or a manual arrow/dot click —
  // which is exactly "reset the countdown on manual interaction" with no
  // separate tracking needed.
  useEffect(() => {
    if (paused || reducedMotion) return;
    const id = setInterval(() => {
      goTo(active + 1);
    }, SLIDE_DURATION);
    return () => clearInterval(id);
  }, [active, paused, reducedMotion, goTo]);

  useEffect(() => {
    function onVisibilityChange() {
      setTabHidden(document.hidden);
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  function onMouseEnter() {
    setHovering(true);
  }

  function onMouseLeave() {
    setHovering(false);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowRight") next();
    else if (event.key === "ArrowLeft") prev();
  }

  function onTouchStart(event: React.TouchEvent) {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  }

  function onTouchEnd(event: React.TouchEvent) {
    if (touchStartX.current == null) return;
    const deltaX = event.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(deltaX) < 50) return;
    if (deltaX < 0) next();
    else prev();
  }

  return (
    <div className="mx-auto w-full max-w-[1920px] px-6 py-8">
      {/* Scoped keyframes for the active dot's progress fill — a plain CSS
          animation (not Framer Motion) so `animation-play-state` can truly
          pause/resume it mid-fill without losing progress. */}
      <style>{`
        @keyframes hero-progress-fill {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
      `}</style>

      <section
        ref={sectionRef}
        role="region"
        aria-roledescription="carousel"
        aria-label="Promotions"
        tabIndex={0}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={onKeyDown}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        // Responsive aspect ratio, not a single fixed one — a 15:4 banner
        // cropped down to a mobile viewport left almost nothing of a source
        // image visible (see the width×height numbers in the PR notes), so
        // the container gets taller as the viewport narrows instead of
        // keeping a fixed ultra-wide ratio at every width. Values match the
        // three device tiers exactly (1080×1080 mobile, 1400×600 tablet,
        // 1920×650 desktop) rather than approximated fractions.
        className="group relative aspect-[1080/1080] w-full overflow-hidden rounded-[24px] bg-black/5 shadow-[0_15px_35px_rgba(0,0,0,0.10)] outline-none sm:aspect-[1400/600] lg:aspect-[1920/650]"
      >
        {SLIDES.map((slide, index) => {
          const isActive = index === active;

          return (
            <Link
              key={slide.src}
              href={slide.href}
              aria-hidden={!isActive}
              tabIndex={isActive ? 0 : -1}
              className={`absolute inset-0 overflow-hidden ${isActive ? "" : "pointer-events-none"}`}
            >
              <motion.div
                className="relative h-full w-full"
                initial={false}
                animate={{ opacity: isActive ? 1 : 0 }}
                transition={
                  reducedMotion
                    ? { duration: 0 }
                    : { duration: TRANSITION_DURATION / 1000, ease: "easeInOut" }
                }
              >
                <Image
                  src={slide.src}
                  alt={slide.alt}
                  fill
                  priority={index === 0}
                  loading={index === 0 ? undefined : "lazy"}
                  quality={88}
                  placeholder="blur"
                  blurDataURL={slide.blurDataURL}
                  sizes="(min-width: 1920px) 1920px, 100vw"
                  className="object-cover object-center"
                />
              </motion.div>
            </Link>
          );
        })}

        <button
          type="button"
          aria-label="Previous slide"
          onClick={prev}
          className="absolute top-1/2 left-4 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white opacity-100 backdrop-blur-sm transition-all sm:h-[46px] sm:w-[46px] lg:h-[52px] lg:w-[52px] md:opacity-0 md:hover:scale-110 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
        >
          <ChevronLeftIcon className="h-[18px] w-[18px] sm:h-5 sm:w-5 lg:h-[22px] lg:w-[22px]" />
        </button>
        <button
          type="button"
          aria-label="Next slide"
          onClick={next}
          className="absolute top-1/2 right-4 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white opacity-100 backdrop-blur-sm transition-all sm:h-[46px] sm:w-[46px] lg:h-[52px] lg:w-[52px] md:opacity-0 md:hover:scale-110 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
        >
          <ChevronRightIcon className="h-[18px] w-[18px] sm:h-5 sm:w-5 lg:h-[22px] lg:w-[22px]" />
        </button>

        <div className="absolute bottom-0 left-1/2 flex h-11 -translate-x-1/2 items-center gap-1">
          {SLIDES.map((slide, index) => (
            // The visible pill stays small (h-2) — the button itself is a
            // full 44px touch target (this project's mobile touch-target
            // rule) so the hit area doesn't shrink to match the graphic.
            <button
              key={slide.src}
              type="button"
              aria-label={`Go to slide ${index + 1}`}
              aria-current={index === active}
              onClick={() => goTo(index)}
              className="flex h-11 w-11 items-center justify-center"
            >
              <span
                className={`relative block h-2 overflow-hidden rounded-full border border-white transition-all duration-300 ${
                  index === active ? "w-8 bg-white/30" : "w-2 bg-transparent"
                }`}
              >
                {index === active && (
                  <span
                    key={active}
                    className="absolute inset-y-0 left-0 block h-full w-full origin-left rounded-full bg-white"
                    style={
                      reducedMotion
                        ? { transform: "scaleX(1)" }
                        : {
                            animationName: "hero-progress-fill",
                            animationDuration: `${SLIDE_DURATION}ms`,
                            animationTimingFunction: "linear",
                            animationFillMode: "forwards",
                            animationPlayState: paused ? "paused" : "running",
                          }
                    }
                  />
                )}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Watched by the homepage's sticky search bar (see
          components/layout/HomeSearchBar.tsx) to know when the user has
          scrolled past the hero — not visible, not part of the carousel. */}
      <div id="hero-sentinel" aria-hidden="true" />
    </div>
  );
}
