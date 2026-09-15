// Which image each tile in the desktop hero's promo column uses. Pure so the
// campaign / no-campaign states and the missing-image fallbacks are unit-testable.
//
// Tile shapes (measured in HeroSlider.tsx): stacked ~3.4:1, alone ~1.6:1. The
// static banner's wide (10:3) and compact (8:5) images, and the campaign's
// 3.2:1 desktop and 4:3 mobile banners, go to the nearest shape.
export interface HeroPromoInput {
  campaign: { desktopBanner: string | null; mobileBanner: string | null } | null;
  wideImage: string | null;
  compactImage: string | null;
}

export interface HeroPromoPlan {
  layout: "none" | "campaign" | "static" | "both";
  campaignImage: string | null;
  staticImage: string | null;
}

export function planHeroPromo({ campaign, wideImage, compactImage }: HeroPromoInput): HeroPromoPlan {
  // Each static image falls back to the other, so a site that only ever set
  // one of them still shows its banner in either state.
  const wide = wideImage ?? compactImage;
  const compact = compactImage ?? wideImage;
  const both = Boolean(campaign && wide);

  return {
    layout: both ? "both" : campaign ? "campaign" : wide ? "static" : "none",
    campaignImage: campaign
      ? both
        ? (campaign.desktopBanner ?? campaign.mobileBanner)
        : (campaign.mobileBanner ?? campaign.desktopBanner)
      : null,
    staticImage: both ? wide : compact,
  };
}
