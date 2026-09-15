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
const PROMO_SIZES = "(min-width: 1400px) 470px, 35vw";

const promoTileClass =
  "relative block min-h-0 flex-1 overflow-hidden rounded-[24px] bg-black/5 shadow-[0_15px_35px_rgba(0,0,0,0.10)]";

// Admin-entered link: only same-site paths or http(s) URLs become a link.
function safeHref(link: string): string | null {
  return /^\/(?!\/)|^https?:\/\//.test(link) ? link : null;
}

function CampaignPromo({ campaign, image }: { campaign: Campaign; image: string | null }) {
  return (
    <Link
      href={`/campaign/${campaign.slug}`}
      className={`${promoTileClass} ${image ? "" : "bg-[var(--color-warning)]"}`}
    >
      {image && <Image src={image} alt="" fill quality={88} sizes={PROMO_SIZES} className="object-cover" />}
      {/* Kept to a 20px strip: campaign banners put their date line low on the
          image, and the old 32px strip covered "SEP 03 – SEP 10" on the live
          banner at 1024px. */}
      <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-black/55 px-3 py-0.5 text-xs leading-4 text-white">
        <span className="flex min-w-0 items-center gap-1.5 font-bold">
          <BoltIcon className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{campaign.name}</span>
        </span>
        {campaign.end_at && (
          <CampaignCountdown target={campaign.end_at} label="Ends in" size="sm" tone="white" />
        )}
      </span>
    </Link>
  );
}

function StaticPromo({
  imageUrl,
  title,
  buttonText,
  link,
}: {
  imageUrl: string;
  title: string;
  buttonText: string;
  link: string;
}) {
  const href = safeHref(link);
  const content = (
    <>
      <Image src={imageUrl} alt={title || "Promotion"} fill quality={88} sizes={PROMO_SIZES} className="object-cover" />
      {(title || buttonText) && (
        <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-black/60 to-transparent px-4 pt-6 pb-3">
          {title && <span className="min-w-0 truncate text-sm font-bold text-white">{title}</span>}
          {buttonText && (
            <span className="ml-auto shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-black">
              {buttonText}
            </span>
          )}
        </span>
      )}
    </>
  );

  return href ? (
    <Link href={href} className={promoTileClass}>
      {content}
    </Link>
  ) : (
    <div className={promoTileClass}>{content}</div>
  );
}

// Mobile (<768px) and tablet (768–1023px): full-width carousel only.
// Desktop (1024px+): the same carousel in a 65% column beside a 35% column
// holding the active campaign and/or the admin's static promo banner --
// whichever exists fills the column alone.
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
  const hasPromoColumn = promo.layout !== "none";
  const desktopSizes = hasPromoColumn ? DESKTOP_SIZES_WITH_PROMO : DESKTOP_SIZES_FULL;

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

      {/* Mobile: dedicated 16:9 art-directed images, <768px only. */}
      <SlideCarousel
        slides={mobileSlides}
        wrapperClassName="aspect-[1200/675] md:hidden"
        ariaLabel="Promotions"
        imageSizes={MOBILE_SIZES}
        slideDuration={homepage.heroSlideDurationMs}
        autoplay={homepage.heroAutoplay}
        showArrows={false}
        showDots={homepage.heroShowDots}
      />

      {/* The carousel keeps the desktop art's own 1920:650 shape at lg, so
          the shorter hero comes from the narrower column rather than from
          cropping slides whose text runs close to both edges. The promo
          column has no intrinsic height and stretches to that row height. */}
      <div className={hasPromoColumn ? "lg:grid lg:grid-cols-[65fr_35fr] lg:gap-4" : undefined}>
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

        {hasPromoColumn && (
          <div className="hidden lg:flex lg:flex-col lg:gap-4">
            {campaign && <CampaignPromo campaign={campaign} image={promo.campaignImage} />}
            {promo.staticImage && (
              <StaticPromo
                imageUrl={promo.staticImage}
                title={homepage.promoBannerTitle}
                buttonText={homepage.promoBannerButtonText}
                link={homepage.promoBannerLink}
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
