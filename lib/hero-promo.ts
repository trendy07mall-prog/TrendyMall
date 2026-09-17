// Which image each hero promo tile uses, per breakpoint. Pure so the campaign /
// no-campaign states and the missing-image fallbacks are unit-testable.
//
// Tile shapes (measured in HeroSlider.tsx): desktop column stacked ~3.4:1,
// desktop column alone ~1.6:1, phone row side by side 8:5, phone row alone
// 10:3. The static banner's wide (10:3) and compact (8:5) images, and the
// campaign's 3.2:1 desktop and 4:3 mobile banners, go to the nearest shape.
export interface HeroCampaignBanners {
  desktopBanner: string | null;
  mobileBanner: string | null;
}

export interface HeroPromoInput {
  // EVERY currently-active homepage campaign, in the order they should
  // rotate (the caller's order -- getHomepageCampaigns sorts soonest-ending
  // first). Previously this took a single campaign, which meant a store
  // running two campaigns at once silently showed only one of them in the
  // hero. An empty array is the no-campaign case.
  campaigns: HeroCampaignBanners[];
  wideImage: string | null;
  compactImage: string | null;
}

export interface HeroPromoPlan {
  layout: "none" | "campaign" | "static" | "both";
  // One image per campaign, index-aligned with the input array, so the
  // rotating slot can pair each campaign with the picture for its own tile
  // shape. A single campaign yields a single-entry array and renders as the
  // same static tile it always did.
  mobile: { campaignImages: (string | null)[]; staticImage: string | null };
  desktop: { campaignImages: (string | null)[]; staticImage: string | null };
}

export function planHeroPromo({ campaigns, wideImage, compactImage }: HeroPromoInput): HeroPromoPlan {
  // Each static image falls back to the other, so a site that only ever set
  // one of them still shows its banner in every slot.
  const wide = wideImage ?? compactImage;
  const compact = compactImage ?? wideImage;
  const hasCampaign = campaigns.length > 0;
  const both = Boolean(hasCampaign && wide);

  // Side by side on a phone the campaign tile is 8:5 (closest to the 4:3
  // mobile banner); alone it is a 10:3 strip (closest to the 3.2:1 desktop
  // banner). The desktop column is the other way round. Each campaign also
  // falls back to whichever single banner it does have.
  const mobileImage = (c: HeroCampaignBanners) =>
    both ? (c.mobileBanner ?? c.desktopBanner) : (c.desktopBanner ?? c.mobileBanner);
  const desktopImage = (c: HeroCampaignBanners) =>
    both ? (c.desktopBanner ?? c.mobileBanner) : (c.mobileBanner ?? c.desktopBanner);

  return {
    layout: both ? "both" : hasCampaign ? "campaign" : wide ? "static" : "none",
    mobile: {
      campaignImages: campaigns.map(mobileImage),
      staticImage: both ? compact : wide,
    },
    desktop: {
      campaignImages: campaigns.map(desktopImage),
      staticImage: both ? wide : compact,
    },
  };
}
