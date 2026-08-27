import { getImageProps } from "next/image";
import { SlideCarousel } from "@/components/marketing/SlideCarousel";
import type { Slide } from "@/components/marketing/SlideCarousel";
import type { Campaign } from "@/types";

// Homepage banner for however many campaigns currently have
// show_on_homepage=true and are genuinely active (see getHomepageCampaigns).
// Reuses SlideCarousel exactly the way HeroSlider.tsx does -- two
// device-specific instances, CSS-gated visibility, no client-side breakpoint
// check -- rather than a second, parallel carousel implementation. A single
// campaign renders as a plain static banner (SlideCarousel itself skips
// nav/dots/autoplay for a 1-slide array); zero campaigns renders nothing.
const MOBILE_SIZES = "100vw";
const DESKTOP_SIZES = "100vw";

export function CampaignBannerCarousel({ campaigns }: { campaigns: Campaign[] }) {
  if (campaigns.length === 0) return null;

  const mobileSlides: Slide[] = [];
  const desktopSlides: Slide[] = [];
  for (const campaign of campaigns) {
    const mobile = campaign.mobile_banner_url ?? campaign.desktop_banner_url;
    const desktop = campaign.desktop_banner_url ?? campaign.mobile_banner_url;
    if (!mobile && !desktop) continue;
    const href = `/campaign/${campaign.slug}`;
    if (mobile) mobileSlides.push({ src: mobile, alt: campaign.name, href });
    if (desktop) desktopSlides.push({ src: desktop, alt: campaign.name, href });
  }
  if (mobileSlides.length === 0 && desktopSlides.length === 0) return null;

  // Same media-gated preload technique as HeroSlider.tsx -- primes the
  // exact optimizer URL/srcSet the first slide's own <Image> will request,
  // gated so only the browser's actually-matching breakpoint fetches it.
  const { props: mobilePreload } = mobileSlides[0]
    ? getImageProps({ src: mobileSlides[0].src, alt: "", fill: true, quality: 88, sizes: MOBILE_SIZES })
    : { props: null };
  const { props: desktopPreload } = desktopSlides[0]
    ? getImageProps({ src: desktopSlides[0].src, alt: "", fill: true, quality: 88, sizes: DESKTOP_SIZES })
    : { props: null };

  return (
    <div className="mx-auto w-full max-w-[1920px] px-6 pt-6">
      {mobilePreload && (
        <link
          rel="preload"
          as="image"
          href={mobilePreload.src}
          imageSrcSet={mobilePreload.srcSet}
          imageSizes={MOBILE_SIZES}
          media="(max-width: 767px)"
        />
      )}
      {desktopPreload && (
        <link
          rel="preload"
          as="image"
          href={desktopPreload.src}
          imageSrcSet={desktopPreload.srcSet}
          imageSizes={DESKTOP_SIZES}
          media="(min-width: 768px)"
        />
      )}

      {mobileSlides.length > 0 && (
        // 800/600 (4:3) matches the "Recommended 800×600" hint on the
        // mobile banner upload field exactly -- see CampaignBanner.tsx's
        // identical fix for the full explanation (this component and that
        // one render the same admin-uploaded mobile banners on two
        // different pages, so both needed the same correction).
        <SlideCarousel
          slides={mobileSlides}
          wrapperClassName="aspect-[800/600] md:hidden"
          ariaLabel="Active campaigns"
          imageSizes={MOBILE_SIZES}
        />
      )}
      {desktopSlides.length > 0 && (
        <SlideCarousel
          slides={desktopSlides}
          wrapperClassName="hidden md:block aspect-[1920/650]"
          ariaLabel="Active campaigns"
          imageSizes={DESKTOP_SIZES}
        />
      )}
    </div>
  );
}
