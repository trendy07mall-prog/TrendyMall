import { getImageProps } from "next/image";
import { SlideCarousel } from "@/components/marketing/SlideCarousel";
import type { Slide } from "@/components/marketing/SlideCarousel";
import { getActiveHeroSlides } from "@/lib/data/hero-slides";
import { getHomepageSettings } from "@/lib/data/settings";

const MOBILE_SIZES = "100vw";
const DESKTOP_SIZES = "(min-width: 1920px) 1920px, 100vw";

// Tablet/desktop — same md: (768px) breakpoint already used sitewide for
// "tablet and up" (header icons, this hero's own mobile/desktop image
// split from an earlier phase), not a new one.
export async function HeroSlider() {
  const [homepage, heroSlides] = await Promise.all([getHomepageSettings(), getActiveHeroSlides()]);

  if (!homepage.heroEnabled || heroSlides.length === 0) return null;

  // Admin-uploaded slides have no hand-authored blurDataURL (the original
  // 6 hardcoded placeholders can't be generated without new image-
  // processing tooling) -- a known, disclosed, cosmetic trade-off: new/
  // edited slides just skip the blur-up effect on first paint.
  const desktopSlides: Slide[] = heroSlides.map((slide) => ({
    src: slide.desktopImageUrl,
    alt: slide.title,
    href: slide.buttonLink,
    subtitle: slide.subtitle ?? undefined,
    buttonText: slide.buttonText ?? undefined,
  }));
  const mobileSlides: Slide[] = heroSlides.map((slide) => ({
    src: slide.mobileImageUrl,
    alt: slide.title,
    href: slide.buttonLink,
    subtitle: slide.subtitle ?? undefined,
    buttonText: slide.buttonText ?? undefined,
  }));

  // getImageProps resolves the exact same optimizer URL/srcSet next/image's
  // <Image> below will request for each breakpoint's first slide — so these
  // preload links prime the real cache entry (no wasted duplicate fetch),
  // gated by `media` so only the browser's actually-matching breakpoint ever
  // fetches its candidate. This is the only way to get a responsive,
  // art-directed preload with next/image: the `priority` prop has no media
  // awareness and would preload both device's first slide unconditionally.
  const { props: mobilePreload } = getImageProps({
    src: mobileSlides[0].src,
    alt: "",
    fill: true,
    quality: 88,
    sizes: MOBILE_SIZES,
  });
  const { props: desktopPreload } = getImageProps({
    src: desktopSlides[0].src,
    alt: "",
    fill: true,
    quality: 88,
    sizes: DESKTOP_SIZES,
  });

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

      {/* Mobile: dedicated 16:9 art-directed images, <768px only. */}
      <SlideCarousel
        slides={mobileSlides}
        wrapperClassName="aspect-[1200/675] md:hidden"
        ariaLabel="Promotions"
        imageSizes={MOBILE_SIZES}
        slideDuration={homepage.heroSlideDurationMs}
        autoplay={homepage.heroAutoplay}
        showArrows={homepage.heroShowArrows}
        showDots={homepage.heroShowDots}
      />

      {/* Tablet/desktop: dedicated images, unchanged aspect ratios. */}
      <SlideCarousel
        slides={desktopSlides}
        wrapperClassName="hidden md:block md:aspect-[1400/600] lg:aspect-[1920/650]"
        ariaLabel="Promotions"
        imageSizes={DESKTOP_SIZES}
        slideDuration={homepage.heroSlideDurationMs}
        autoplay={homepage.heroAutoplay}
        showArrows={homepage.heroShowArrows}
        showDots={homepage.heroShowDots}
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
