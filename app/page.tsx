import Link from "next/link";
import type { Metadata } from "next";
import localFont from "next/font/local";
import { getAuthUser } from "@/lib/supabase/server";
import { applyCampaignFeaturedDisplay } from "@/lib/data/campaigns";
import {
  getCachedCategories,
  getCachedNewArrivals,
  getCachedProductsByIds,
  getCachedHomepageCampaigns,
  getCachedCampaignSections,
  getCachedCampaignSoldCounts,
  getCachedCampaignFeaturedDisplay,
  getCachedGeneralSettings,
} from "@/lib/data/cached";
import { formatBusinessHoursSummary } from "@/lib/campaign-datetime";
import { HeroSlider } from "@/components/marketing/HeroSlider";
import { ServiceCards } from "@/components/marketing/ServiceCards";
import { CampaignBannerCarousel } from "@/components/marketing/CampaignBannerCarousel";
import { ActiveCampaignSections } from "@/components/marketing/ActiveCampaignSections";
import { CategoryCard } from "@/components/marketing/CategoryCard";
import { ProductCard } from "@/components/product/ProductCard";
import { Carousel } from "@/components/marketing/Carousel";
import { CustomerFavouritesSection } from "@/components/marketing/CustomerFavouritesSection";
import { ShopByBrandSection } from "@/components/marketing/ShopByBrandSection";
import { WhyShopWithUs } from "@/components/marketing/WhyShopWithUs";
import { CustomerReviews } from "@/components/marketing/CustomerReviews";
import { HomeNewsletter } from "@/components/marketing/HomeNewsletter";
import { RecentlyViewedSection } from "@/components/product/RecentlyViewedSection";
import { FadeIn } from "@/components/motion/FadeIn";
import type { ProductWithPrimaryImage } from "@/types";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

// Homepage-only heading font (see .home-fonts in globals.css) — every
// other page keeps Manrope headings via the root layout, untouched.
// Self-hosted, same reasoning as app/layout.tsx's manrope/inter.
const poppins = localFont({
  src: [
    { path: "./fonts/poppins-700.woff2", weight: "700" },
    { path: "./fonts/poppins-800.woff2", weight: "800" },
  ],
  variable: "--font-poppins",
  display: "swap",
});

function SectionHeader({ title, viewAllHref }: { title: string; viewAllHref: string }) {
  return (
    <FadeIn>
      <div className="flex items-center justify-between gap-3">
        {/* text-xl (not the original 32px) at mobile widths is what keeps
            "Explore by Category" -- the longer of this component's two
            titles -- on one line down to 320px; sm:/md: restore the
            original 28px/32px extrabold where there's room to spare. Fixed,
            known strings (unlike ActiveCampaignSections' admin-entered
            campaign names), so no truncate/ellipsis safety net needed here. */}
        <h2 className="font-heading min-w-0 text-base font-bold tracking-tight whitespace-nowrap sm:text-[28px] sm:font-extrabold md:text-[32px]">
          {title}
        </h2>
        <Link
          href={viewAllHref}
          className="shrink-0 text-sm font-semibold underline-offset-2 hover:underline"
        >
          View All →
        </Link>
      </div>
    </FadeIn>
  );
}

export default async function HomePage() {
  const [categories, newArrivals, homepageCampaigns, general, { data: { user } }] = await Promise.all([
    getCachedCategories(0),
    getCachedNewArrivals(10),
    getCachedHomepageCampaigns(),
    getCachedGeneralSettings(),
    getAuthUser(),
  ]);
  const businessHoursSummary = `WhatsApp or call us, ${formatBusinessHoursSummary(general.businessHours).replace("Daily,", "daily")}.`;

  // One batched campaign_items query (getCampaignSections) plus one batched
  // getProductsByIds call for the union of every campaign's product ids --
  // flat query count regardless of how many campaigns/products are active,
  // never one query per campaign or per product.
  const campaignSectionGroups = await getCachedCampaignSections(homepageCampaigns);
  const allCampaignProductIds = [...new Set(campaignSectionGroups.flatMap((g) => g.productIds))];
  const campaignProducts =
    allCampaignProductIds.length > 0 ? await getCachedProductsByIds(allCampaignProductIds) : [];
  const campaignProductsById = new Map(campaignProducts.map((p) => [p.id, p]));

  // Campaign-context display fix: a product's card in THIS carousel must
  // feature its own campaign-joined variant's price (plus badge/countdown/
  // sold-count), never the product's globally-cheapest variant if that
  // happens to be a different, non-campaign one -- see
  // getCampaignFeaturedDisplayByProduct's own comment in
  // lib/data/campaigns.ts for why this has to be a separate function
  // rather than a change to the shop/category/PDP/cart pricing path. One
  // sold-count query batched across every homepage campaign at once, one
  // featured-display query per campaign (not per product).
  const campaignIds = campaignSectionGroups.map((g) => g.campaign.id);
  // Independent of each other (both only depend on campaignSectionGroups/
  // campaignIds, resolved above), so one shared Promise.all instead of
  // awaiting the sold-count query before starting the featured-display
  // one -- same query count, one fewer round trip's worth of latency.
  const [soldCountsByCampaignId, featuredByCampaignId] = await Promise.all([
    getCachedCampaignSoldCounts(campaignIds),
    Promise.all(
      campaignSectionGroups.map(
        async (g) =>
          [g.campaign.id, await getCachedCampaignFeaturedDisplay(g.campaign.id, g.productIds)] as const,
      ),
    ).then((entries) => new Map(entries)),
  ]);

  const campaignSections = campaignSectionGroups
    .map((group) => {
      // A campaign's items can outlive a product being unpublished --
      // filter(Boolean) drops those rather than rendering a hole in the
      // carousel.
      const rawProducts = group.productIds
        .map((id) => campaignProductsById.get(id))
        .filter((p): p is ProductWithPrimaryImage => p != null);
      const products = applyCampaignFeaturedDisplay(
        rawProducts,
        group.campaign,
        featuredByCampaignId.get(group.campaign.id) ?? new Map(),
        soldCountsByCampaignId.get(group.campaign.id) ?? new Map(),
      );
      return { campaign: group.campaign, products };
    })
    .filter((section) => section.products.length > 0);

  return (
    <div className={`home-fonts ${poppins.variable} flex flex-1 flex-col`}>
      {/* homepageCampaigns is already sorted soonest-ending first -- the
          same list ActiveCampaignSections below is built from. All of them,
          not just the first: the hero's campaign tile rotates through every
          active campaign rather than silently dropping the rest. */}
      <HeroSlider campaigns={homepageCampaigns} />

      {categories.length > 0 && (
        <section id="categories" className="mx-auto w-full max-w-[var(--home-container-width)] px-6 py-[var(--home-section-padding-y)]">
          <SectionHeader title="Explore by Category" viewAllHref="/shop" />
          <div className="mt-6">
            <Carousel ariaLabel="Categories" itemClassName="w-[70%] sm:w-1/2 lg:w-1/6" showArrows={false}>
              {categories.map((category) => (
                <CategoryCard key={category.id} category={category} />
              ))}
            </Carousel>
          </div>
        </section>
      )}

      <ActiveCampaignSections sections={campaignSections} />

      {/* Tablet only (768-1023px). Below 768 the hero's own promo ROW shows
          the rotating campaign tile, and from 1024 its promo COLUMN does --
          this carousel was a duplicate of both, so it is hidden there. But
          the hero's promo slot exists at neither size in between (the row is
          md:hidden, the column is hidden lg:flex), so removing this outright
          left tablet with no campaign visibility at all. Kept here as the
          stopgap: tablet stays on this older banner-carousel design until
          the promo slot is extended to that range in its own right.
          /shop renders the same component, unchanged. */}
      <div className="hidden md:block lg:hidden">
        <CampaignBannerCarousel campaigns={homepageCampaigns} />
      </div>

      <ServiceCards />

      {newArrivals.length > 0 && (
        <section className="mx-auto w-full max-w-[var(--home-container-width)] px-6 py-[var(--home-section-padding-y)]">
          <SectionHeader title="New Arrivals" viewAllHref="/new-arrivals" />
          <div className="mt-6">
            <Carousel
              ariaLabel="New arrivals"
              itemClassName="w-1/2 sm:w-1/3 lg:w-1/5"
              autoAdvanceMs={5000}
              showArrows={newArrivals.length > 5}
            >
              {newArrivals.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </Carousel>
          </div>
        </section>
      )}

      {/* Directly above Shop by Brand. Fetches its own data (it is the
          only consumer of it, and it decides its own mode server-side), so
          it is a plain child here rather than another prop threaded
          through this page's data block. */}
      <CustomerFavouritesSection />

      {/* Directly above Why Shop With Us, per the brand-pages ticket. This
          section fetches its own data (it is the only consumer of it), so
          it is a plain child here rather than another prop threaded through
          this page's data block. */}
      <ShopByBrandSection />

      <WhyShopWithUs businessHoursSummary={businessHoursSummary} />

      <CustomerReviews />

      <HomeNewsletter defaultEmail={user?.email} />

      <div className="mx-auto w-full max-w-[var(--home-container-width)] px-6 pb-[var(--home-section-padding-y)]">
        <RecentlyViewedSection />
      </div>
    </div>
  );
}
