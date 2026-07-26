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
    src: "/images/hero/banner-25-off.jpg",
    alt: "25% off storewide",
    href: "/shop?onSale=1",
    blurDataURL:
      "data:image/jpeg;base64,/9j/2wBDABQODxIPDRQSEBIXFRQYHjIhHhwcHj0sLiQySUBMS0dARkVQWnNiUFVtVkVGZIhlbXd7gYKBTmCNl4x9lnN+gXz/2wBDARUXFx4aHjshITt8U0ZTfHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHz/wAARCAAFAAwDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAMG/8QAGRABAQEBAQEAAAAAAAAAAAAAAQIAEQNx/8QAFAEBAAAAAAAAAAAAAAAAAAAAAf/EABURAQEAAAAAAAAAAAAAAAAAAAAB/9oADAMBAAIRAxEAPwDLejMkhB1ke907sp6SHzMxC//Z",
  },
  {
    src: "/images/hero/banner-free-shipping.jpg",
    alt: "Free delivery on eligible orders",
    href: "/shop?freeDelivery=1",
    blurDataURL:
      "data:image/jpeg;base64,/9j/2wBDABQODxIPDRQSEBIXFRQYHjIhHhwcHj0sLiQySUBMS0dARkVQWnNiUFVtVkVGZIhlbXd7gYKBTmCNl4x9lnN+gXz/2wBDARUXFx4aHjshITt8U0ZTfHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHz/wAARCAAFAAwDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAIG/8QAFxABAQEBAAAAAAAAAAAAAAAAAQIAEf/EABQBAQAAAAAAAAAAAAAAAAAAAAH/xAAVEQEBAAAAAAAAAAAAAAAAAAAAAf/aAAwDAQACEQMRAD8Ay11EEhB1kerouuvSQzMQv//Z",
  },
  {
    src: "/images/hero/banner-trending-products.jpg",
    alt: "Trending products",
    href: "/new-arrivals",
    blurDataURL:
      "data:image/jpeg;base64,/9j/2wBDABQODxIPDRQSEBIXFRQYHjIhHhwcHj0sLiQySUBMS0dARkVQWnNiUFVtVkVGZIhlbXd7gYKBTmCNl4x9lnN+gXz/2wBDARUXFx4aHjshITt8U0ZTfHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHz/wAARCAAFAAwDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAIG/8QAGBABAQEBAQAAAAAAAAAAAAAAAQIAESH/xAAUAQEAAAAAAAAAAAAAAAAAAAAB/8QAFREBAQAAAAAAAAAAAAAAAAAAAAH/2gAMAwEAAhEDEQA/AMvbEEhArI9V0VQvkhmYhf/Z",
  },
];

// Tunable — try 2000-4000 to compare a snappier feel against the current 5s.
const SLIDE_DURATION = 5000; // ms each slide is visible
const TRANSITION_DURATION = 800; // ms crossfade/slide transition
const PARALLAX_MAX = 10; // px, desktop mouse-parallax clamp

export function HeroSlider() {
  const [active, setActive] = useState(0);
  const [previousActive, setPreviousActive] = useState<number | null>(null);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [hovering, setHovering] = useState(false);
  const [focused, setFocused] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  const paused = hovering || focused || tabHidden;

  const touchStartX = useRef<number | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const parallaxRefs = useRef<(HTMLDivElement | null)[]>([]);
  const rafRef = useRef<number | null>(null);

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

  // Applies will-change only for the transition's own duration, then clears
  // it — this "flag true, then false after a timer" shape is inherently
  // effect-only (it can't be derived during render), same class of
  // exception as the localStorage-read effects elsewhere in this app.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTransitioning(true);
    const timeout = setTimeout(() => setTransitioning(false), TRANSITION_DURATION);
    return () => clearTimeout(timeout);
  }, [active]);

  const goTo = useCallback(
    (targetIndex: number, dir: 1 | -1) => {
      const normalized = ((targetIndex % SLIDES.length) + SLIDES.length) % SLIDES.length;
      if (normalized === active) return;
      setPreviousActive(active);
      setDirection(dir);
      setActive(normalized);
    },
    [active],
  );

  function next() {
    goTo(active + 1, 1);
  }

  function prev() {
    goTo(active - 1, -1);
  }

  // Reruns (tearing down + restarting the interval) whenever `active`
  // changes for ANY reason — automatic tick or a manual arrow/dot click —
  // which is exactly "reset the countdown on manual interaction" with no
  // separate tracking needed.
  useEffect(() => {
    if (paused || reducedMotion) return;
    const id = setInterval(() => {
      goTo(active + 1, 1);
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

  // Desktop-only mouse parallax: written straight to each layer's style via
  // a ref (not React state) so rapid mousemove events don't force re-renders
  // for a purely cosmetic ±10px shift. Combined with the hover-driven
  // will-change toggle in the same effect — every mutation of the
  // `parallaxRefs` DOM nodes has to live in one place once any of it does,
  // per the hooks linter's ref-mutation-ownership rule.
  useEffect(() => {
    if (reducedMotion) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const section = sectionRef.current;
    if (!section) return;

    for (const el of parallaxRefs.current) {
      if (!el) continue;
      if (hovering) {
        el.style.willChange = "transform";
      } else {
        el.style.willChange = "auto";
        el.style.transform = "translate(0px, 0px)";
      }
    }

    function onMouseMove(event: MouseEvent) {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const rect = section!.getBoundingClientRect();
        const relX = (event.clientX - rect.left) / rect.width - 0.5;
        const relY = (event.clientY - rect.top) / rect.height - 0.5;
        const px = Math.max(-0.5, Math.min(0.5, -relX)) * 2 * PARALLAX_MAX;
        const py = Math.max(-0.5, Math.min(0.5, -relY)) * 2 * PARALLAX_MAX;
        for (const el of parallaxRefs.current) {
          if (el) el.style.transform = `translate(${px}px, ${py}px)`;
        }
      });
    }

    section.addEventListener("mousemove", onMouseMove);
    return () => {
      section.removeEventListener("mousemove", onMouseMove);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [reducedMotion, hovering]);

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
    <div className="mx-auto w-full max-w-[1730px] px-6 py-8">
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
        className="group relative aspect-[15/4] w-full overflow-hidden rounded-[var(--radius-lg)] bg-black/5 outline-none"
      >
        {SLIDES.map((slide, index) => {
          const isActive = index === active;
          const isPrev = index === previousActive;
          const slideX = isActive ? 0 : isPrev ? -direction * 30 : direction * 30;

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
                style={{ willChange: transitioning ? "transform, opacity" : "auto" }}
                initial={false}
                animate={{ opacity: isActive ? 1 : 0, x: slideX }}
                transition={
                  reducedMotion
                    ? { duration: 0 }
                    : { duration: TRANSITION_DURATION / 1000, ease: "easeInOut" }
                }
              >
                <motion.div
                  className="relative h-full w-full"
                  initial={false}
                  animate={{
                    scale: reducedMotion ? 1 : isActive ? 1.08 : 1,
                    x: reducedMotion ? 0 : isActive ? -14 : 0,
                  }}
                  transition={
                    reducedMotion
                      ? { duration: 0 }
                      : { duration: SLIDE_DURATION / 1000, ease: "easeOut" }
                  }
                >
                  <div
                    ref={(el) => {
                      parallaxRefs.current[index] = el;
                    }}
                    className="relative h-full w-full"
                  >
                    <Image
                      src={slide.src}
                      alt={slide.alt}
                      fill
                      priority={index === 0}
                      quality={90}
                      placeholder="blur"
                      blurDataURL={slide.blurDataURL}
                      sizes="(min-width: 1730px) 1730px, 100vw"
                      className="object-cover"
                    />
                  </div>
                </motion.div>
              </motion.div>
            </Link>
          );
        })}

        <button
          type="button"
          aria-label="Previous slide"
          onClick={prev}
          className="absolute top-1/2 left-4 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white opacity-100 transition-all md:opacity-0 md:hover:scale-110 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
        <button
          type="button"
          aria-label="Next slide"
          onClick={next}
          className="absolute top-1/2 right-4 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white opacity-100 transition-all md:opacity-0 md:hover:scale-110 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
        >
          <ChevronRightIcon className="h-5 w-5" />
        </button>

        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
          {SLIDES.map((slide, index) => (
            <button
              key={slide.src}
              type="button"
              aria-label={`Go to slide ${index + 1}`}
              aria-current={index === active}
              onClick={() => goTo(index, index > active ? 1 : -1)}
              className={`relative h-2 overflow-hidden rounded-full border border-white transition-all duration-300 ${
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
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
