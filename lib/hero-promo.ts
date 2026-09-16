// Which image each hero promo tile uses, per breakpoint. Pure so the campaign /
// no-campaign states and the missing-image fallbacks are unit-testable.
//
// Tile shapes (measured in HeroSlider.tsx): desktop column stacked ~3.4:1,
// desktop column alone ~1.6:1, phone row side by side 8:5, phone row alone
// 10:3. The static banner's wide (10:3) and compact (8:5) images, and the
// campaign's 3.2:1 desktop and 4:3 mobile banners, go to the nearest shape.
export interface HeroPromoInput {
  campaign: { desktopBanner: string | null; mobileBanner: string | null } | null;
  wideImage: string | null;
  compactImage: string | null;
}

export interface HeroPromoPlan {
  layout: "none" | "campaign" | "static" | "both";
  mobile: { campaignImage: string | null; staticImage: string | null };
  desktop: { campaignImage: string | null; staticImage: string | null };
}

export function planHeroPromo({ campaign, wideImage, compactImage }: HeroPromoInput): HeroPromoPlan {
  // Each static image falls back to the other, so a site that only ever set
  // one of them still shows its banner in every slot.
  const wide = wideImage ?? compactImage;
  const compact = compactImage ?? wideImage;
  const both = Boolean(campaign && wide);
  const desktopBanner = campaign ? (campaign.desktopBanner ?? campaign.mobileBanner) : null;
  const mobileBanner = campaign ? (campaign.mobileBanner ?? campaign.desktopBanner) : null;

  return {
    layout: both ? "both" : campaign ? "campaign" : wide ? "static" : "none",
    // Side by side on a phone the campaign tile is 8:5 (closest to the 4:3
    // mobile banner); alone it is a 10:3 strip (closest to the 3.2:1 desktop
    // banner). The desktop column is the other way round.
    mobile: {
      campaignImage: both ? mobileBanner : desktopBanner,
      staticImage: both ? compact : wide,
    },
    desktop: {
      campaignImage: both ? desktopBanner : mobileBanner,
      staticImage: both ? wide : compact,
    },
  };
}
