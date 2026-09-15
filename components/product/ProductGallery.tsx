"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { CloseIcon, ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/Icon";
import { GalleryCampaignBar } from "@/components/product/GalleryCampaignBar";

// Fade-only, no bounce, short duration -- same motion rule this project's
// other crossfade (HeroSlider.tsx's slide transition) already follows.

export function ProductGallery({
  images,
  name,
  campaign = null,
}: {
  images: string[];
  name: string;
  // Only ever set when the resolved variant is genuinely on a winning
  // campaign price (see ProductGalleryWithVariants, the only caller) --
  // null renders no bar at all, never a placeholder/empty one. imageUrl is
  // independently nullable within that: GalleryCampaignBar falls back to
  // the flat orange bar when it's null (a campaign with no banner
  // uploaded yet).
  campaign?: { name: string; endAt: string | null; soldCount: number | null; imageUrl: string | null } | null;
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
    // Block flow, not flex-col: WebKit (all iOS browsers) sized the bleeding
    // aspect-square box below from its pre-bleed width as a flex item, so it
    // came out 390x342 on a 390px phone and clipped the photo's bottom 48px.
    <div>
      {/* No rounded-[var(--radius-lg)] here (unlike before) -- edge-to-edge
          per the redesign, scoped to just this main-image container. The
          thumbnail row below keeps its own corners; this doesn't touch
          anything outside the media area. bg-black/5 stays: it's the
          letterbox behind object-contain for a non-square source photo,
          not decorative whitespace, so it's unrelated to the "no
          padding/margin/whitespace" requirement.

          -mx-6 sm:mx-0: TRUE edge-to-edge to the physical screen, not just
          to this component's own container. The PDP's outer wrapper (app/
          product/[slug]/page.tsx) is px-6 (24px) on every side, and that's
          the only thing between this image and the viewport edge below
          `sm` -- no ancestor between here and there adds its own padding
          or clips overflow, so a negative margin exactly canceling that
          24px expands this box (and, via inset-x-0 below, the campaign bar
          riding on top of it) flush to both screen edges. sm:mx-0 turns it
          off at 640px+ -- desktop is unaffected, matching the mockup
          (which only ever showed this on a phone-width screenshot) and
          "Desktop layout unaffected" from the ticket. The thumbnail row
          and everything in the info column keep their normal padding;
          this only touches the one div it's on.

          w-auto sm:w-full, NOT plain w-full -- caught by measuring the
          rendered box, not by eye: w-full resolves to a FIXED pixel width
          (100% of the padded parent's content box, computed before the
          negative margin is applied), so it only slides the box left by
          24px rather than widening it. That put the left edge exactly at
          the screen edge but left the right edge 48px short (390 viewport
          - 342 measured). width:auto is what lets a block box actually
          fill all the space its now-wider margins make available, on both
          sides -- the standard mechanism this bleed technique depends on.
          sm:w-full restores the exact original desktop sizing once mx-0
          also turns off, so nothing here changes above 640px. */}
      <div
        className="group relative -mx-6 aspect-square w-auto overflow-hidden bg-black/5 sm:mx-0 sm:w-full"
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
          {/* Was AnimatePresence + motion.div. key={active} still remounts
              on image change, which replays the CSS fade-in below. The old
              exit fade is gone -- the outgoing image is replaced rather
              than fading out under the incoming one -- which is the one
              visible difference from the Framer Motion version. */}
          <>
            {current ? (
              <div key={active} className="gallery-image-fade absolute inset-0">
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
              </div>
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm text-[var(--muted)]">
                No image
              </div>
            )}
          </>
        </button>

        {/* Painted after the zoom button, same "later in the DOM wins the
            stacking" convention the thumbnail border below already relies
            on (see its own comment) -- no z-index needed, this project's
            other absolutely-positioned overlays on this image (the arrow
            buttons just below) follow the same rule. Only occupies the top
            strip of the image, so it doesn't block zoom clicks anywhere
            else on the photo. */}
        {campaign && (
          <GalleryCampaignBar
            campaignName={campaign.name}
            campaignEndAt={campaign.endAt}
            soldCount={campaign.soldCount}
            imageUrl={campaign.imageUrl}
          />
        )}

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
        <div className="mt-4 flex min-w-0 gap-3 overflow-x-auto pb-1">
          {images.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`View image ${i + 1}`}
              aria-current={i === active}
              // Borderless per the redesign -- no permanent per-thumbnail
              // border (removed below) and no ring-offset halo (which read
              // as its own thin card border once rendered). ring-inset
              // keeps the selected indicator flush against the thumbnail's
              // own edge instead of floating outside it, still triggered
              // by the exact same onClick as before -- only the styling of
              // "which one is selected" changed, not how selection works.
              // Unselected rows dim instead of carrying any border/ring,
              // full opacity on hover as the only other affordance.
              //
              // ring-[1.5px] + orange (#F97316, this project's brand
              // accent -- --color-warning elsewhere in this file) replaces
              // the earlier ring-2 navy (#0F2D52), which read as a heavy
              // near-black outline. 1.5px is a genuine arbitrary value, not
              // Tailwind's ring-1 (1px, felt too thin against a 64-76px
              // thumbnail) or ring-2 (2px, the weight being toned down).
              className={`relative h-[64px] w-[64px] shrink-0 overflow-hidden rounded-[var(--radius-sm)] transition-all duration-150 ease-in-out sm:h-[76px] sm:w-[76px] ${
                i === active
                  ? "opacity-100 ring-[1.5px] ring-inset ring-[#F97316]"
                  : "opacity-60 hover:opacity-100"
              }`}
            >
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
              {/* The permanent per-thumbnail border that used to sit here
                  is gone -- "borderless thumbnails" per the redesign. The
                  ring above (on the button itself, ring-inset) is now the
                  only outline any thumbnail ever draws, and only the
                  selected one draws it. */}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
