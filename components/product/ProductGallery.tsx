"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { CloseIcon, ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/Icon";

// Fade-only, no bounce, short duration -- same motion rule this project's
// other crossfade (HeroSlider.tsx's slide transition) already follows.
const FADE_TRANSITION = { duration: 0.25, ease: "easeInOut" as const };

export function ProductGallery({
  images,
  name,
}: {
  images: string[];
  name: string;
}) {
  const [active, setActive] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [hoverZoom, setHoverZoom] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState("50% 50%");
  const current = images[active];
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (!zoomOpen) return;
    document.body.style.overflow = "hidden";
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setZoomOpen(false);
      if (event.key === "ArrowRight") setActive((i) => Math.min(images.length - 1, i + 1));
      if (event.key === "ArrowLeft") setActive((i) => Math.max(0, i - 1));
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [zoomOpen, images.length]);

  function next() {
    setActive((i) => (i + 1) % images.length);
  }

  function prev() {
    setActive((i) => (i - 1 + images.length) % images.length);
  }

  function onTouchStart(event: React.TouchEvent) {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  }

  // Same 50px-threshold swipe pattern as HeroSlider.tsx, for consistency
  // with the one other swipeable surface on the site.
  function onTouchEnd(event: React.TouchEvent) {
    if (touchStartX.current == null || images.length <= 1) return;
    const deltaX = event.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(deltaX) < 50) return;
    if (deltaX < 0) next();
    else prev();
  }

  function onMouseMove(event: React.MouseEvent<HTMLButtonElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setZoomOrigin(`${x}% ${y}%`);
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        className="group relative aspect-square w-full overflow-hidden rounded-[var(--radius-lg)] bg-black/5"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <button
          type="button"
          onClick={() => current && setZoomOpen(true)}
          onMouseMove={onMouseMove}
          onMouseEnter={() => setHoverZoom(true)}
          onMouseLeave={() => setHoverZoom(false)}
          aria-label="Zoom image"
          className="relative block h-full w-full cursor-zoom-in"
        >
          <AnimatePresence initial={false}>
            {current ? (
              <motion.div
                key={active}
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={FADE_TRANSITION}
              >
                <Image
                  src={current}
                  alt={name}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  // object-contain (not cover): a gallery image's own real
                  // aspect ratio varies per photo, and cover crops each one
                  // differently to fill this square frame -- unpredictably
                  // cutting off badges/text baked into some photos while
                  // barely touching others. Matches the zoomed modal below,
                  // which already used object-contain for the same reason.
                  // The hover-zoom effect (the transform below) is a
                  // separate mechanism -- a CSS scale on this same element
                  // -- and is unaffected by object-fit either way.
                  className="object-contain transition-transform duration-300 ease-out"
                  style={
                    hoverZoom
                      ? { transform: "scale(1.8)", transformOrigin: zoomOrigin }
                      : undefined
                  }
                />
              </motion.div>
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm text-[var(--muted)]">
                No image
              </div>
            )}
          </AnimatePresence>
        </button>

        {images.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous image"
              onClick={prev}
              className="absolute top-1/2 left-3 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[var(--foreground)] opacity-100 shadow-[var(--shadow-card-hover)] transition-opacity duration-200 md:opacity-0 md:group-hover:opacity-100"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Next image"
              onClick={next}
              className="absolute top-1/2 right-3 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[var(--foreground)] opacity-100 shadow-[var(--shadow-card-hover)] transition-opacity duration-200 md:opacity-0 md:group-hover:opacity-100"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {zoomOpen && current && (
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-6">
          <button
            type="button"
            aria-label="Close zoomed image"
            className="absolute inset-0 bg-black/80"
            onClick={() => setZoomOpen(false)}
          />
          <button
            type="button"
            aria-label="Close zoomed image"
            onClick={() => setZoomOpen(false)}
            className="absolute top-5 right-5 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
          {images.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous image"
                onClick={prev}
                className="absolute top-1/2 left-5 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                <ChevronLeftIcon className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label="Next image"
                onClick={next}
                className="absolute top-1/2 right-5 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                <ChevronRightIcon className="h-5 w-5" />
              </button>
            </>
          )}
          {/* No touch handlers and no touch-action restriction on this
              container, deliberately -- swipe-to-browse lives on the inline
              gallery above; in here touch input is left 100% native so
              pinch-to-zoom works cleanly, with no risk of a swipe handler
              misreading one finger of a two-finger pinch as a page-change
              gesture. Nothing elsewhere in the app restricts the viewport's
              user-scalable/maximum-scale, so this is the only place that
              needs to stay fully hands-off. Arrow buttons above cover
              between-image navigation while zoomed instead. */}
          <div className="relative h-full w-full max-w-3xl">
            <Image
              src={current}
              alt={name}
              fill
              // Matches the real max-w-3xl (768px) cap this container never
              // exceeds -- "100vw" was requesting widths (1920px+) this
              // image can never actually display at.
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-contain"
            />
          </div>
        </div>
      )}

      {images.length > 1 && (
        <div className="flex min-w-0 gap-3 overflow-x-auto pb-1">
          {images.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`View image ${i + 1}`}
              aria-current={i === active}
              className={`relative h-[76px] w-[76px] shrink-0 overflow-hidden rounded-[var(--radius-sm)] ring-2 ring-offset-2 transition-all duration-150 ease-in-out ${
                i === active
                  ? "ring-[#0F2D52]"
                  : "ring-transparent hover:ring-[var(--border-hover)]"
              }`}
            >
              <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[var(--radius-sm)] border border-[var(--border)]" />
              {/* object-contain (not cover), same reasoning as the main
                  image above -- this is the actual bug: each photo's own
                  aspect ratio differs, so cover crops every thumbnail
                  differently (some barely, some cutting off a badge/text
                  near an edge that's fully visible when that same photo is
                  shown as the main image, which used to only be
                  coincidentally less-cropped rather than genuinely
                  uncropped). contain guarantees every thumbnail shows its
                  whole photo, consistently, regardless of source aspect
                  ratio. */}
              <Image
                src={src}
                alt={`${name} — photo ${i + 1}`}
                fill
                loading="lazy"
                sizes="76px"
                className="object-contain"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
