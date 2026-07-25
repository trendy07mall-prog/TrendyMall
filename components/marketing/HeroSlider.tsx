"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/Icon";

interface Slide {
  src: string;
  alt: string;
  href: string;
}

const SLIDES: Slide[] = [
  { src: "/images/hero/banner-25-off.png", alt: "25% off storewide", href: "/shop?onSale=1" },
  {
    src: "/images/hero/banner-free-shipping.png",
    alt: "Free delivery on eligible orders",
    href: "/shop?freeDelivery=1",
  },
  {
    src: "/images/hero/banner-trending-products.png",
    alt: "Trending products",
    href: "/new-arrivals",
  },
];

const AUTOPLAY_MS = 5000;

export function HeroSlider() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const touchStartX = useRef<number | null>(null);

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

  useEffect(() => {
    if (paused || reducedMotion) return;
    const id = setInterval(() => {
      setActive((i) => (i + 1) % SLIDES.length);
    }, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [paused, reducedMotion]);

  useEffect(() => {
    function onVisibilityChange() {
      setPaused(document.hidden);
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  function goTo(index: number) {
    setActive(((index % SLIDES.length) + SLIDES.length) % SLIDES.length);
  }

  function next() {
    goTo(active + 1);
  }

  function prev() {
    goTo(active - 1);
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
      role="region"
      aria-roledescription="carousel"
      aria-label="Promotions"
      tabIndex={0}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onKeyDown={onKeyDown}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      className="group relative aspect-[16/7] w-full overflow-hidden bg-black/5 outline-none sm:aspect-[21/9]"
    >
      {SLIDES.map((slide, index) => (
        <Link
          key={slide.src}
          href={slide.href}
          aria-hidden={index !== active}
          tabIndex={index === active ? 0 : -1}
          className={`absolute inset-0 transition-opacity duration-[800ms] ease-in-out ${
            index === active ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          <Image
            src={slide.src}
            alt={slide.alt}
            fill
            priority={index === 0}
            sizes="100vw"
            className="object-cover"
          />
        </Link>
      ))}

      <button
        type="button"
        aria-label="Previous slide"
        onClick={prev}
        className="absolute top-1/2 left-4 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
      >
        <ChevronLeftIcon className="h-5 w-5" />
      </button>
      <button
        type="button"
        aria-label="Next slide"
        onClick={next}
        className="absolute top-1/2 right-4 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
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
            onClick={() => goTo(index)}
            className={`h-2.5 w-2.5 rounded-full border border-white transition-colors ${
              index === active ? "bg-white" : "bg-transparent"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
