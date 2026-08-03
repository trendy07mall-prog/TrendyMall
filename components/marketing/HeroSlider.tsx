"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image, { getImageProps } from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/Icon";

interface Slide {
  src: string;
  alt: string;
  // null = no click action (no Link, no pointer cursor) — only the
  // "click" slide in each set actually navigates anywhere.
  href: string | null;
  blurDataURL: string;
}

// Tablet/desktop — same md: (768px) breakpoint already used sitewide for
// "tablet and up" (header icons, this hero's own mobile/desktop image
// split from an earlier phase), not a new one.
const DESKTOP_SLIDES: Slide[] = [
  {
    src: "/images/hero/hero-desktop-1-who.webp",
    alt: "TrendyMall — Sri Lanka's online shop for mobile phone accessories",
    href: null,
    blurDataURL:
      "data:image/jpeg;base64,/9j/2wBDABQODxIPDRQSEBIXFRQYHjIhHhwcHj0sLiQySUBMS0dARkVQWnNiUFVtVkVGZIhlbXd7gYKBTmCNl4x9lnN+gXz/2wBDARUXFx4aHjshITt8U0ZTfHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHz/wAARCAADAAgDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAbEAACAQUAAAAAAAAAAAAAAAAAAQQRIjNRcf/EABUBAQEAAAAAAAAAAAAAAAAAAAID/8QAFhEBAQEAAAAAAAAAAAAAAAAAAAEx/9oADAMBAAIRAxEAPwCDHdslUWLXAAVmhX//2Q==",
  },
  {
    src: "/images/hero/hero-desktop-2-click.webp",
    alt: "Get 5% off your order — limited-time discount, use code 1ST ORDER",
    href: "/coupons",
    blurDataURL:
      "data:image/jpeg;base64,/9j/2wBDABQODxIPDRQSEBIXFRQYHjIhHhwcHj0sLiQySUBMS0dARkVQWnNiUFVtVkVGZIhlbXd7gYKBTmCNl4x9lnN+gXz/2wBDARUXFx4aHjshITt8U0ZTfHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHz/wAARCAADAAgDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAZEAACAwEAAAAAAAAAAAAAAAAAAQQSMRH/xAAVAQEBAAAAAAAAAAAAAAAAAAAEBf/EABURAQEAAAAAAAAAAAAAAAAAAAAB/9oADAMBAAIRAxEAPwCbZuLV4l3AAFXq/9k=",
  },
  {
    src: "/images/hero/hero-desktop-3-freeshipping.webp",
    alt: "TrendyMall islandwide delivery",
    href: null,
    blurDataURL:
      "data:image/jpeg;base64,/9j/2wBDABQODxIPDRQSEBIXFRQYHjIhHhwcHj0sLiQySUBMS0dARkVQWnNiUFVtVkVGZIhlbXd7gYKBTmCNl4x9lnN+gXz/2wBDARUXFx4aHjshITt8U0ZTfHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHz/wAARCAADAAgDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAaEAACAgMAAAAAAAAAAAAAAAAAAgERAzEy/8QAFQEBAQAAAAAAAAAAAAAAAAAAAQP/xAAYEQACAwAAAAAAAAAAAAAAAAAAAREhMf/aAAwDAQACEQMRAD8AszkdXmmnu9gAlFisP//Z",
  },
];

// Mobile — dedicated 16:9 crops (art direction, not CSS-cropped from
// desktop). All 3 slides now available; click behavior mirrors desktop.
const MOBILE_SLIDES: Slide[] = [
  {
    src: "/images/hero/hero-mobile-1-who.webp",
    alt: "TrendyMall — Sri Lanka's online shop for mobile phone accessories",
    href: null,
    blurDataURL:
      "data:image/jpeg;base64,/9j/2wBDABQODxIPDRQSEBIXFRQYHjIhHhwcHj0sLiQySUBMS0dARkVQWnNiUFVtVkVGZIhlbXd7gYKBTmCNl4x9lnN+gXz/2wBDARUXFx4aHjshITt8U0ZTfHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHz/wAARCAAEAAgDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAbEAEAAgIDAAAAAAAAAAAAAAABAAIDMQQRIf/EABUBAQEAAAAAAAAAAAAAAAAAAAID/8QAFhEBAQEAAAAAAAAAAAAAAAAAAAEx/9oADAMBAAIRAxEAPwCDgQOTVqPeLaemoiJWaFf/2Q==",
  },
  {
    src: "/images/hero/hero-mobile-2-click.webp",
    alt: "Get 5% off your order — limited-time discount, use code 1ST ORDER",
    href: "/coupons",
    blurDataURL:
      "data:image/jpeg;base64,/9j/2wBDABQODxIPDRQSEBIXFRQYHjIhHhwcHj0sLiQySUBMS0dARkVQWnNiUFVtVkVGZIhlbXd7gYKBTmCNl4x9lnN+gXz/2wBDARUXFx4aHjshITt8U0ZTfHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHz/wAARCAAEAAgDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAbEAACAgMBAAAAAAAAAAAAAAAAAQIRISRBkf/EABUBAQEAAAAAAAAAAAAAAAAAAAQF/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AmuWoo1F9us+gAIvv/9k=",
  },
  {
    src: "/images/hero/hero-mobile-3-freeshipping.webp",
    alt: "TrendyMall islandwide delivery",
    href: null,
    blurDataURL:
      "data:image/jpeg;base64,/9j/2wBDABQODxIPDRQSEBIXFRQYHjIhHhwcHj0sLiQySUBMS0dARkVQWnNiUFVtVkVGZIhlbXd7gYKBTmCNl4x9lnN+gXz/2wBDARUXFx4aHjshITt8U0ZTfHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHz/wAARCAAEAAgDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAaEAADAQADAAAAAAAAAAAAAAAAAQIRAzFx/8QAFQEBAQAAAAAAAAAAAAAAAAAAAgP/xAAXEQADAQAAAAAAAAAAAAAAAAAAATEC/9oADAMBAAIRAxEAPwC3V3xttXT29x9eAAk6LMP/2Q==",
  },
];

// Fade-only per this project's hero spec — no zoom, scale, parallax, or
// bounce. Kept shorter than the old Ken-Burns build's transition so the
// crossfade still feels snappy at this shorter 4s interval.
const SLIDE_DURATION = 4000; // ms each slide is visible
const TRANSITION_DURATION = 600; // ms crossfade transition

// One fully self-contained carousel instance (own state/interval/touch
// handling), rendered twice by HeroSlider below — once for mobile's slide
// set, once for desktop's — with CSS alone deciding which one is visible.
// This (not a single instance switching its `slides` prop via a
// client-side matchMedia check) is deliberate: a JS-computed breakpoint
// would render the wrong slide set for one frame after hydration before
// correcting itself — Tailwind's responsive classes are already correct in
// the very first paint, server-rendered and client-rendered alike.
function SlideCarousel({
  slides,
  wrapperClassName,
  ariaLabel,
  imageSizes,
}: {
  slides: Slide[];
  wrapperClassName: string;
  ariaLabel: string;
  imageSizes: string;
}) {
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
                : { duration: TRANSITION_DURATION / 1000, ease: "easeInOut" }
            }
          >
            <Image
              src={slide.src}
              alt={slide.alt}
              fill
              // Every slide (including index 0) lazy-loads here — the
              // correct-for-this-breakpoint first slide instead gets a
              // real fetch priority boost from the manual, media-gated
              // <link rel="preload"> tags below (built with
              // next/image's own getImageProps so the preloaded URL
              // exactly matches what this <Image> will request, no
              // wasted duplicate fetch). Using next/image's own
              // `priority` here instead would preload BOTH the mobile
              // and desktop first slide unconditionally, since it has
              // no media-query awareness.
              loading="lazy"
              quality={88}
              placeholder="blur"
              blurDataURL={slide.blurDataURL}
              sizes={imageSizes}
              className="object-cover object-center"
            />
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
  );
}

const MOBILE_SIZES = "100vw";
const DESKTOP_SIZES = "(min-width: 1920px) 1920px, 100vw";

// getImageProps resolves the exact same optimizer URL/srcSet next/image's
// <Image> below will request for each breakpoint's first slide — so these
// preload links prime the real cache entry (no wasted duplicate fetch),
// gated by `media` so only the browser's actually-matching breakpoint ever
// fetches its candidate. This is the only way to get a responsive,
// art-directed preload with next/image: the `priority` prop has no media
// awareness and would preload both device's first slide unconditionally.
const { props: mobilePreload } = getImageProps({
  src: MOBILE_SLIDES[0].src,
  alt: "",
  fill: true,
  quality: 88,
  sizes: MOBILE_SIZES,
});
const { props: desktopPreload } = getImageProps({
  src: DESKTOP_SLIDES[0].src,
  alt: "",
  fill: true,
  quality: 88,
  sizes: DESKTOP_SIZES,
});

export function HeroSlider() {
  return (
    <div className="mx-auto w-full max-w-[1920px] px-6 py-8">
      {/* Resource hints, not rendered images — React hoists <link> elements
          rendered anywhere in the tree up into <head> automatically. */}
      <link
        rel="preload"
        as="image"
        href={mobilePreload.src}
        imageSrcSet={mobilePreload.srcSet}
        imageSizes={MOBILE_SIZES}
        media="(max-width: 767px)"
      />
      <link
        rel="preload"
        as="image"
        href={desktopPreload.src}
        imageSrcSet={desktopPreload.srcSet}
        imageSizes={DESKTOP_SIZES}
        media="(min-width: 768px)"
      />

      {/* Scoped keyframes for the active dot's progress fill — a plain CSS
          animation (not Framer Motion) so `animation-play-state` can truly
          pause/resume it mid-fill without losing progress. Shared by both
          carousel instances below. */}
      <style>{`
        @keyframes hero-progress-fill {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
      `}</style>

      {/* Mobile: dedicated 16:9 art-directed images, <768px only. */}
      <SlideCarousel
        slides={MOBILE_SLIDES}
        wrapperClassName="aspect-[1200/675] md:hidden"
        ariaLabel="Promotions"
        imageSizes={MOBILE_SIZES}
      />

      {/* Tablet/desktop: dedicated images, unchanged aspect ratios. */}
      <SlideCarousel
        slides={DESKTOP_SLIDES}
        wrapperClassName="hidden md:block md:aspect-[1400/600] lg:aspect-[1920/650]"
        ariaLabel="Promotions"
        imageSizes={DESKTOP_SIZES}
      />

      {/* Watched by the homepage's sticky search bar (see
          components/layout/HomeSearchBar.tsx) to know when the user has
          scrolled past the hero — not visible, not part of the carousel.
          Only one of the two carousels above is ever actually laid out
          (the other is display:none), so this single sentinel correctly
          reflects "after whichever hero variant is currently shown." */}
      <div id="hero-sentinel" aria-hidden="true" />
    </div>
  );
}
