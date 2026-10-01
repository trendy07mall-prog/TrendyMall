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

  return (
    <div className="mx-auto w-full max-w-[1920px] px-6 pt-6">
      {/* No preload here, deliberately.
          
          This carousel is NEVER the largest-contentful element: on the
          homepage it sits below the hero, and on /shop below the header
          and filters. Preloading it put two high-priority image requests
          ahead of the image that IS the LCP, and on a throttled mobile
          connection they take bandwidth the hero needs. Measured on the
          live homepage: these appeared in <head> while the hero's Load
          Delay was 2,850 ms -- 66% of LCP.
          
          The slides below stay lazy, which is correct for something
          below the fold. */}
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
        // 1600/500 (3.2:1) matches the "Recommended 1600×500" hint on the
        // desktop banner upload field exactly -- see CampaignBanner.tsx's
        // identical fix for the full explanation (this used to be 1920/650,
        // ≈2.95:1, which forced object-cover to crop ~80px off each side of
        // a genuinely-3.2:1 upload at 1920px wide).
        <SlideCarousel
          slides={desktopSlides}
          wrapperClassName="hidden md:block aspect-[1600/500]"
          ariaLabel="Active campaigns"
          imageSizes={DESKTOP_SIZES}
        />
      )}
    </div>
  );
}
