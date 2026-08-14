"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/Icon";

export interface Slide {
  src: string;
  alt: string;
  // null = no click action (no Link, no pointer cursor) — only the
  // "click" slide in each set actually navigates anywhere.
  href: string | null;
  // Optional -- HeroSlider's own slides have hand-authored base64
  // placeholders for known local images; a consumer with dynamic/uploaded
  // images (e.g. campaign banners) has no equivalent pre-generated
  // placeholder, so placeholder="blur" is only applied when this is set.
  blurDataURL?: string;
  // Optional text overlay (heading is `alt`) -- only rendered when
  // `subtitle` or `buttonText` is set, so a slide with neither (every
  // slide today) looks exactly like a plain image, unchanged. The button
  // is a styled span, not a real nested <a> -- it shares the slide's own
  // `href` as its destination, avoiding invalid nested-anchor markup.
  subtitle?: string;
  buttonText?: string;
}

// Fade-only per this project's hero spec — no zoom, scale, parallax, or
// bounce. Kept shorter than the old Ken-Burns build's transition so the
// crossfade still feels snappy at this shorter default interval.
const DEFAULT_SLIDE_DURATION = 4000; // ms each slide is visible
const DEFAULT_TRANSITION_DURATION = 600; // ms crossfade transition

// One fully self-contained carousel instance (own state/interval/touch
// handling) -- extracted from HeroSlider.tsx so campaign banners (and any
// future device-specific rotating banner) can reuse the exact same
// autoplay/dots/arrows/swipe/reduced-motion engine instead of a second,
// parallel implementation. Originally rendered twice by HeroSlider (once
// per device's slide set) with CSS alone deciding which is visible -- any
// consumer wanting device-specific art direction should follow the same
// pattern (two instances, md:hidden/hidden md:block), not a client-side
// breakpoint check, which would render the wrong slide set for one frame
// after hydration before correcting itself.
export function SlideCarousel({
  slides,
  wrapperClassName,
  ariaLabel,
  imageSizes,
  slideDuration = DEFAULT_SLIDE_DURATION,
  transitionDuration = DEFAULT_TRANSITION_DURATION,
  autoplay = true,
  showArrows = true,
  showDots = true,
}: {
  slides: Slide[];
  wrapperClassName: string;
  ariaLabel: string;
  imageSizes: string;
  slideDuration?: number;
  transitionDuration?: number;
  // Settings-backed (homepage.hero_autoplay/hero_show_arrows/hero_show_dots)
  // — all default to today's live behavior (unconditionally on). autoplay
  // composes with, never overrides, the existing reduced-motion gate below.
  // showArrows/showDots AND with the existing `isCarousel` check, so a
  // single slide still never shows controls regardless of these.
  autoplay?: boolean;
  showArrows?: boolean;
  showDots?: boolean;
}) {
  const [active, setActive] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [focused, setFocused] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const paused = hovering || focused || tabHidden;
  const touchStartX = useRef<number | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  // Nav/dots/autoplay are meaningless chrome around a single image --
  // skipped entirely rather than rendered-but-inert, so a lone slide reads
  // as a plain static banner, not a 1-slide carousel with dead controls.
  const isCarousel = slides.length > 1;

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

  const goTo = useCallback(
    (targetIndex: number) => {
      setActive(((targetIndex % slides.length) + slides.length) % slides.length);
    },
    [slides.length],
  );

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
    if (!isCarousel || !autoplay || paused || reducedMotion) return;
    const id = setInterval(() => {
      goTo(active + 1);
    }, slideDuration);
    return () => clearInterval(id);
  }, [active, paused, reducedMotion, goTo, isCarousel, slideDuration, autoplay]);

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
    <section
      ref={sectionRef}
      role="region"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      tabIndex={0}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onKeyDown={onKeyDown}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      className={`group relative w-full overflow-hidden rounded-[24px] bg-black/5 shadow-[0_15px_35px_rgba(0,0,0,0.10)] outline-none ${wrapperClassName}`}
    >
      {/* Scoped keyframes for the active dot's progress fill — a plain CSS
          animation (not Framer Motion) so `animation-play-state` can truly
          pause/resume it mid-fill without losing progress. Self-contained
          here (not a consumer's responsibility) so every usage gets it for
          free; harmless if two instances of this component render side by
          side (e.g. HeroSlider's mobile+desktop pair), just a few
          duplicate bytes. */}
      <style>{`
        @keyframes slide-carousel-progress-fill {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
      `}</style>

      {slides.map((slide, index) => {
        const isActive = index === active;

        const content = (
          <motion.div
            className="relative h-full w-full"
            initial={false}
            animate={{ opacity: isActive ? 1 : 0 }}
            transition={
              reducedMotion
                ? { duration: 0 }
                : { duration: transitionDuration / 1000, ease: "easeInOut" }
            }
          >
            <Image
              src={slide.src}
              alt={slide.alt}
              fill
              // Every slide (including index 0) lazy-loads here — the
              // correct-for-this-breakpoint first slide instead gets a
              // real fetch priority boost from the manual, media-gated
              // <link rel="preload"> tags a consumer renders separately
              // (built with next/image's own getImageProps so the
              // preloaded URL exactly matches what this <Image> will
              // request, no wasted duplicate fetch).
              loading="lazy"
              quality={88}
              placeholder={slide.blurDataURL ? "blur" : undefined}
              blurDataURL={slide.blurDataURL}
              sizes={imageSizes}
              className="object-cover object-center"
            />
            {(slide.subtitle || slide.buttonText) && (
              <div className="absolute inset-x-0 bottom-0 flex flex-col items-start gap-2 bg-gradient-to-t from-black/60 via-black/20 to-transparent px-6 py-6 sm:px-10 sm:py-10">
                <p className="max-w-lg text-lg font-bold text-white drop-shadow-sm sm:text-2xl">{slide.alt}</p>
                {slide.subtitle && (
                  <p className="max-w-md text-sm text-white/90 drop-shadow-sm sm:text-base">{slide.subtitle}</p>
                )}
                {slide.buttonText && (
                  <span className="mt-1 inline-flex items-center rounded-full bg-white px-5 py-2 text-sm font-semibold text-black">
                    {slide.buttonText}
                  </span>
                )}
              </div>
            )}
          </motion.div>
        );

        // Only the "click" slide is interactive — the others render a
        // plain, non-focusable div with no href, no pointer cursor, and
        // no click behavior at all.
        return slide.href ? (
          <Link
            key={slide.src}
            href={slide.href}
            aria-hidden={!isActive}
            tabIndex={isActive ? 0 : -1}
            className={`absolute inset-0 overflow-hidden ${isActive ? "" : "pointer-events-none"}`}
          >
            {content}
          </Link>
        ) : (
          <div
            key={slide.src}
            aria-hidden={!isActive}
            className={`absolute inset-0 overflow-hidden ${isActive ? "" : "pointer-events-none"}`}
          >
            {content}
          </div>
        );
      })}

      {isCarousel && showArrows && (
        <>
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
        </>
      )}

      {isCarousel && showDots && (
        <div className="absolute bottom-0 left-1/2 flex h-11 -translate-x-1/2 items-center gap-1">
            {slides.map((slide, index) => (
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
                              animationName: "slide-carousel-progress-fill",
                              animationDuration: `${slideDuration}ms`,
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
        )}
    </section>
  );
}
