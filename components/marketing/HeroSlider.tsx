import { getImageProps } from "next/image";
import { SlideCarousel } from "@/components/marketing/SlideCarousel";
import type { Slide } from "@/components/marketing/SlideCarousel";

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
