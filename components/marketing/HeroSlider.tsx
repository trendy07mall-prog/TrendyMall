import Image, { getImageProps } from "next/image";
import Link from "next/link";
import { SlideCarousel } from "@/components/marketing/SlideCarousel";
import type { Slide } from "@/components/marketing/SlideCarousel";
import { CampaignCountdown } from "@/components/marketing/CampaignCountdown";
import { BoltIcon } from "@/components/ui/Icon";
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

function CampaignPromo({
  campaign,
  image,
  sizes,
  className,
  imageClassName = "object-cover",
  twoLineCaption = false,
}: {
  campaign: Campaign;
  image: string | null;
  sizes: string;
  className: string;
  imageClassName?: string;
  twoLineCaption?: boolean;
}) {
  return (
    <Link
      href={`/campaign/${campaign.slug}`}
      className={`${promoTileClass} ${className} ${image ? "" : "bg-[var(--color-warning)]"}`}
    >
      {image && <Image src={image} alt="" fill quality={88} sizes={sizes} className={imageClassName} />}
      {/* Kept to a 20px strip (28px two-line on a half-width phone tile):
          campaign banners put their date line low on the image, and a taller
          strip covered the live banner's date line at 1024px. */}
      {twoLineCaption ? (
        <span className="absolute inset-x-0 bottom-0 flex flex-col bg-black/55 px-2 py-0.5 text-[11px] leading-3 text-white">
          <span className="flex min-w-0 items-center gap-1 font-bold">
            <BoltIcon className="h-3 w-3 shrink-0" />
            <span className="truncate">{campaign.name}</span>
          </span>
          {campaign.end_at && (
            <CampaignCountdown target={campaign.end_at} label="Ends in" size="sm" tone="white" />
          )}
        </span>
      ) : (
        <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-black/55 px-3 py-0.5 text-xs leading-4 text-white">
          <span className="flex min-w-0 items-center gap-1.5 font-bold">
            <BoltIcon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{campaign.name}</span>
          </span>
          {campaign.end_at && (
            <CampaignCountdown target={campaign.end_at} label="Ends in" size="sm" tone="white" />
          )}
        </span>
      )}
    </Link>
  );
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
export async function HeroSlider({ campaign }: { campaign: Campaign | null }) {
  const [homepage, heroSlides] = await Promise.all([getHomepageSettings(), getActiveHeroSlides()]);

  if (!homepage.heroEnabled || heroSlides.length === 0) return null;

  const promo = planHeroPromo({
    campaign: campaign
      ? { desktopBanner: campaign.desktop_banner_url, mobileBanner: campaign.mobile_banner_url }
      : null,
    wideImage: homepage.promoBannerImageUrl,
    compactImage: homepage.promoBannerAloneImageUrl,
  });
  const both = promo.layout === "both";
  const hasPromo = promo.layout !== "none";
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
    sizes: desktopSizes,
  });

  return (
    <div className="mx-auto w-full max-w-[var(--home-container-width)] px-6 py-8">
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
        imageSizes={desktopSizes}
        media="(min-width: 768px)"
      />

      {/* Mobile: dedicated 16:9 art-directed images, <768px only. -mx-6 with
          w-auto (not w-full, which resolves to a fixed pixel width before the
          negative margin is applied, and so only shifts the box) cancels this
          container's px-6, making the 16:9 box the full device width -- the
          size the mobile slide-image hint documents. rounded-none! beats
          SlideCarousel's own rounded-[24px] regardless of stylesheet order: a
          radius at the screen edge would show page background in the corners. */}
      <SlideCarousel
        slides={mobileSlides}
        wrapperClassName="aspect-[1200/675] -mx-6 w-auto! rounded-none! md:hidden"
        ariaLabel="Promotions"
        imageSizes={MOBILE_SIZES}
        slideDuration={homepage.heroSlideDurationMs}
        autoplay={homepage.heroAutoplay}
        showArrows={false}
        showDots={homepage.heroShowDots}
      />

      {hasPromo && (
        <div className={`mt-3 md:hidden ${both ? "grid grid-cols-2 gap-3" : ""}`}>
          {campaign && (
            <CampaignPromo
              campaign={campaign}
              image={promo.mobile.campaignImage}
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

      {/* The carousel keeps the desktop art's own 1920:650 shape at lg, so
          the shorter hero comes from the narrower column rather than from
          cropping slides whose text runs close to both edges. The promo
          column has no intrinsic height and stretches to that row height. */}
      <div className={hasPromo ? "lg:grid lg:grid-cols-[65fr_35fr] lg:gap-4" : undefined}>
        <SlideCarousel
          slides={desktopSlides}
          wrapperClassName="hidden md:block md:aspect-[1400/600] lg:aspect-[1920/650]"
          ariaLabel="Promotions"
          imageSizes={desktopSizes}
          slideDuration={homepage.heroSlideDurationMs}
          autoplay={homepage.heroAutoplay}
          showArrows={false}
          showDots={homepage.heroShowDots}
        />

        {hasPromo && (
          <div className="hidden lg:flex lg:flex-col lg:gap-4">
            {campaign && (
              <CampaignPromo
                campaign={campaign}
                image={promo.desktop.campaignImage}
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
