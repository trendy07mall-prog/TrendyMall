import Image, { getImageProps } from "next/image";
import ReactDOM from "react-dom";
import Link from "next/link";
import { SlideCarousel } from "@/components/marketing/SlideCarousel";
import type { Slide } from "@/components/marketing/SlideCarousel";
import { CampaignPromoRotator } from "@/components/marketing/CampaignPromoRotator";
import type { CampaignPromoItem } from "@/components/marketing/CampaignPromoRotator";
import { getActiveHeroSlides } from "@/lib/data/hero-slides";
import { getHomepageSettings } from "@/lib/data/settings";
import { planHeroPromo } from "@/lib/hero-promo";
import type { Campaign } from "@/types";

const MOBILE_SIZES = "100vw";
// From lg the carousel is the 65% column of the 1400px home container
// (~870px) when promo banners sit beside it, full container width otherwise.
const DESKTOP_SIZES_WITH_PROMO = "(min-width: 1400px) 870px, (min-width: 1024px) 65vw, 100vw";
const DESKTOP_SIZES_FULL = "(min-width: 1400px) 1352px, 100vw";
const PROMO_COLUMN_SIZES = "(min-width: 1400px) 470px, 35vw";

const promoTileClass =
  "relative block overflow-hidden rounded-[24px] bg-black/5 shadow-[0_15px_35px_rgba(0,0,0,0.10)]";

// Admin-entered link: only same-site paths or http(s) URLs become a link.
function safeHref(link: string): string | null {
  return /^\/(?!\/)|^https?:\/\//.test(link) ? link : null;
}

function StaticPromo({
  imageUrl,
  title,
  buttonText,
  link,
  sizes,
  className,
  compact = false,
}: {
  imageUrl: string;
  title: string;
  buttonText: string;
  link: string;
  sizes: string;
  className: string;
  compact?: boolean;
}) {
  const href = safeHref(link);
  const content = (
    <>
      <Image src={imageUrl} alt={title || "Promotion"} fill quality={88} sizes={sizes} className="object-cover" />
      {(title || buttonText) && (
        <span
          className={`absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/60 to-transparent ${
            compact ? "gap-1.5 px-2 pt-4 pb-2" : "gap-3 px-4 pt-6 pb-3"
          }`}
        >
          {title && (
            <span className={`min-w-0 truncate font-bold text-white ${compact ? "text-[11px]" : "text-sm"}`}>
              {title}
            </span>
          )}
          {buttonText && (
            <span
              className={`ml-auto shrink-0 rounded-full bg-white font-semibold text-black ${
                compact ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs"
              }`}
            >
              {buttonText}
            </span>
          )}
        </span>
      )}
    </>
  );

  return href ? (
    <Link href={href} className={`${promoTileClass} ${className}`}>
      {content}
    </Link>
  ) : (
    <div className={`${promoTileClass} ${className}`}>{content}</div>
  );
}

// Mobile (<768px): edge-to-edge 16:9 carousel, then a promo row -- campaign
// and static banner side by side, or whichever exists alone at full width.
// Tablet (768-1023px): unchanged full-width carousel, no promo. Desktop
// (1024px+): carousel in a 65% column beside a 35% column of the same
// promos, stacked.
// `campaigns` is every currently-active homepage campaign, not just the
// first: the campaign tile rotates through them when there is more than
// one, and renders exactly the static tile it always did when there is one.
export async function HeroSlider({ campaigns }: { campaigns: Campaign[] }) {
  const [homepage, heroSlides] = await Promise.all([getHomepageSettings(), getActiveHeroSlides()]);

  if (!homepage.heroEnabled || heroSlides.length === 0) return null;

  const promo = planHeroPromo({
    campaigns: campaigns.map((c) => ({
      desktopBanner: c.desktop_banner_url,
      mobileBanner: c.mobile_banner_url,
    })),
    wideImage: homepage.promoBannerImageUrl,
    compactImage: homepage.promoBannerAloneImageUrl,
  });
  const both = promo.layout === "both";
  const hasPromo = promo.layout !== "none";
  const hasCampaign = campaigns.length > 0;
  // Only the fields the tile actually renders cross into the client
  // component, rather than the whole campaign row per breakpoint.
  const promoItems = (images: (string | null)[]): CampaignPromoItem[] =>
    campaigns.map((c, index) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      endAt: c.end_at,
      image: images[index] ?? null,
    }));
  const desktopSizes = hasPromo ? DESKTOP_SIZES_WITH_PROMO : DESKTOP_SIZES_FULL;
  const staticText = {
    title: homepage.promoBannerTitle,
    buttonText: homepage.promoBannerButtonText,
    link: homepage.promoBannerLink,
  };

  // Admin-uploaded slides have no hand-authored blurDataURL (the original
  // 6 hardcoded placeholders can't be generated without new image-
  // processing tooling) -- a known, disclosed, cosmetic trade-off: new/
  // edited slides just skip the blur-up effect on first paint.
  // The breakpoint that decides which hero art a browser fetches. Used in
  // three places that MUST agree: the <source media> on each slide, the
  // two preload hints below, and the wrapper's md: aspect-ratio switch.
  // If they disagree, a device downloads one image and displays another.
  const WIDE_MEDIA = "(min-width: 768px)";

  // ONE slide list, each slide carrying both breakpoints' art.
  //
  // This used to be two arrays feeding two SlideCarousels, with CSS
  // hiding whichever did not apply. That leaked: display:none stops a
  // LAZY image downloading but not an EAGER one, and the first slide is
  // eager because it is the LCP element. Measured before this change, a
  // desktop visitor fetched the mobile hero as well as its own -- 180 KB
  // of hero at 1440px instead of ~138 KB.
  //
  // getImageProps gives the exact URLs and srcSets next/image would have
  // requested, so the <picture> below and the preload hints resolve to
  // the same cache entry rather than racing for two.
  const slides: Slide[] = heroSlides.map((slide) => {
    const { props: narrow } = getImageProps({
      src: slide.mobileImageUrl,
      alt: slide.title,
      fill: true,
      quality: 88,
      sizes: MOBILE_SIZES,
    });
    const { props: wide } = getImageProps({
      src: slide.desktopImageUrl,
      alt: slide.title,
      fill: true,
      quality: 88,
      sizes: desktopSizes,
    });

    return {
      // Kept for the Slide type and as the ultimate fallback; the
      // <picture> below is what actually renders.
      src: slide.mobileImageUrl,
      alt: slide.title,
      href: slide.buttonLink,
      subtitle: slide.subtitle ?? undefined,
      buttonText: slide.buttonText ?? undefined,
      artDirected: {
        src: narrow.src,
        srcSet: narrow.srcSet ?? "",
        sizes: MOBILE_SIZES,
        wideSrcSet: wide.srcSet ?? "",
        wideSizes: desktopSizes,
        media: WIDE_MEDIA,
      },
    };
  });

  // getImageProps resolves the exact same optimizer URL/srcSet next/image's
  // <Image> below will request for each breakpoint's first slide — so these
  // preload links prime the real cache entry (no wasted duplicate fetch),
  // gated by `media` so only the browser's actually-matching breakpoint ever
  // fetches its candidate. This is the only way to get a responsive,
  // art-directed preload with next/image: the `priority` prop has no media
  // awareness and would preload both device's first slide unconditionally.
  const { props: mobilePreload } = getImageProps({
    src: heroSlides[0].mobileImageUrl,
    alt: "",
    fill: true,
    quality: 88,
    sizes: MOBILE_SIZES,
  });
  const { props: desktopPreload } = getImageProps({
    src: heroSlides[0].desktopImageUrl,
    alt: "",
    fill: true,
    quality: 88,
    sizes: desktopSizes,
  });

  // ReactDOM.preload, NOT a rendered <link>.
  //
  // This component is async, so its output is streamed after the shell
  // has already been flushed. A <link rel=preload> rendered here looked
  // right in the markup but never reached <head>: it arrived inside the
  // __next_f RSC payload and was only inserted into the DOM once React
  // hydrated -- long after the moment a preload is useful. Measured on
  // the live site: "hero-mobile" appeared 0 times in <head> and twice
  // inside __next_f scripts, and the hero image's Load Delay was
  // 2,170 ms (52% of LCP).
  //
  // ReactDOM.preload is React's own Float API for exactly this: it emits
  // the hint as early as the renderer can, including from a streamed
  // boundary. Same URLs as before (getImageProps resolves what <Image>
  // will really request), still media-gated so only the matching
  // breakpoint fetches, so there is no duplicate download.
  ReactDOM.preload(mobilePreload.src, {
    as: "image",
    imageSrcSet: mobilePreload.srcSet,
    imageSizes: MOBILE_SIZES,
    media: "(max-width: 767px)",
    fetchPriority: "high",
  });
  ReactDOM.preload(desktopPreload.src, {
    as: "image",
    imageSrcSet: desktopPreload.srcSet,
    imageSizes: desktopSizes,
    media: WIDE_MEDIA,
    fetchPriority: "high",
  });

  return (
    <div className="mx-auto w-full max-w-[var(--home-container-width)] px-6 py-8">

      {/* The carousel keeps the desktop art's own 1920:650 shape at lg, so
          the shorter hero comes from the narrower column rather than from
          cropping slides whose text runs close to both edges. The promo
          column has no intrinsic height and stretches to that row height. */}
      <div className={hasPromo ? "lg:grid lg:grid-cols-[65fr_35fr] lg:gap-4" : undefined}>
        <SlideCarousel
          slides={slides}
          // Both breakpoints' wrappers, merged. Below md it is the 16:9
          // mobile box, full-bleed: -mx-6 with w-auto cancels the
          // container's px-6 (w-full would resolve to a pixel width
          // BEFORE the negative margin is applied, and so only shift the
          // box), and rounded-none! beats SlideCarousel's own
          // rounded-[24px], because a radius at the screen edge shows
          // page background in the corners. From md up it returns to a
          // contained, rounded box at the desktop art's aspect ratios.
          wrapperClassName="aspect-[1200/675] -mx-6 w-auto! rounded-none! md:mx-0 md:w-full! md:rounded-[24px] md:aspect-[1400/600] lg:aspect-[1920/650]"
          ariaLabel="Promotions"
          // The LCP element at EVERY width now, not only on a phone: one
          // <picture> serves both, so marking it eager no longer drags
          // the other breakpoint's art down with it. The media-gated
          // preloads above still prime whichever candidate the browser
          // actually picks.
          eagerFirstSlide
          imageSizes={desktopSizes}
          slideDuration={homepage.heroSlideDurationMs}
          autoplay={homepage.heroAutoplay}
          showArrows={false}
          showDots={homepage.heroShowDots}
        />

        {hasPromo && (
          <div className="hidden lg:flex lg:flex-col lg:gap-4">
            {hasCampaign && (
              <CampaignPromoRotator
                campaigns={promoItems(promo.desktop.campaignImages)}
                sizes={PROMO_COLUMN_SIZES}
                className="min-h-0 flex-1"
              />
            )}
            {promo.desktop.staticImage && (
              <StaticPromo
                imageUrl={promo.desktop.staticImage}
                sizes={PROMO_COLUMN_SIZES}
                className="min-h-0 flex-1"
                {...staticText}
              />
            )}
          </div>
        )}
      </div>

      {/* Mobile promo row. Sits AFTER the hero in source order rather
          than before it, which is what puts it UNDER the hero on a
          phone: the hero is now a single carousel inside the lg grid,
          and below lg that grid is a plain block. md:hidden, so it never
          appears alongside the desktop promo column. */}
      {hasPromo && (
        <div className={`mt-3 md:hidden ${both ? "grid grid-cols-2 gap-3" : ""}`}>
          {hasCampaign && (
            <CampaignPromoRotator
              campaigns={promoItems(promo.mobile.campaignImages)}
              sizes={both ? "50vw" : "100vw"}
              className={both ? "aspect-[8/5]" : "aspect-[10/3]"}
              // Pinned to the top in the half-width tile so the 4:3 banner's
              // text (upper part of the image) is what survives the crop.
              imageClassName={both ? "object-cover object-top" : "object-cover"}
              twoLineCaption={both}
            />
          )}
          {promo.mobile.staticImage && (
            <StaticPromo
              imageUrl={promo.mobile.staticImage}
              sizes={both ? "50vw" : "100vw"}
              className={both ? "aspect-[8/5]" : "aspect-[10/3]"}
              compact={both}
              {...staticText}
            />
          )}
        </div>
      )}

      {/* Watched by the homepage's sticky search bar (see
          components/layout/HomeSearchBar.tsx) to know when the user has
          scrolled past the hero — not visible, not part of the carousel.
          There is one carousel now rather than a CSS-hidden pair, so this
          sentinel simply follows the hero at every width. */}
      <div id="hero-sentinel" aria-hidden="true" />
    </div>
  );
}
