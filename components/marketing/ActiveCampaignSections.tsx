import Link from "next/link";
import Image from "next/image";
import { CampaignProductCard } from "@/components/marketing/CampaignProductCard";
import { Carousel } from "@/components/marketing/Carousel";
import { FadeIn } from "@/components/motion/FadeIn";
import { CampaignCountdown } from "@/components/marketing/CampaignCountdown";
import { BoltIcon } from "@/components/ui/Icon";
import { DEFAULT_SECTION_BG, sectionInk } from "@/lib/section-color";
import type { CSSProperties } from "react";
import type { Campaign, ProductWithPrimaryImage } from "@/types";

export interface CampaignSectionWithProducts {
  campaign: Campaign;
  products: ProductWithPrimaryImage[];
}

// One section per show_on_homepage-active campaign, each carousel holding
// ONLY that campaign's own products -- never merged across campaigns.
// Zero sections renders nothing at all (no empty heading, no placeholder),
// same "additive, nothing to show means nothing rendered" rule
// CampaignBannerCarousel already follows.
//
// Two looks, both on the campaign's own colour with compact campaign cards
// (CampaignProductCard) on a panel; the products, order and carousel behaviour
// are the same in both. The first campaign (sections arrive soonest-ending
// first) gets the full-width banner with its cards rising into it; any
// further campaigns get the side banner, so a second or third sale reads
// as a different block rather than a repeat of the first.
export function ActiveCampaignSections({ sections }: { sections: CampaignSectionWithProducts[] }) {
  if (sections.length === 0) return null;

  return (
    <>
      {sections.map((section, index) => (
        <section
          key={section.campaign.id}
          // Narrower than the page's other sections: at full width the
          // 3.2:1 banner alone stood taller than most screens' first view.
          className="campaign-section mx-auto w-full max-w-[1180px] px-3 py-[var(--home-section-padding-y)] sm:px-6"
        >
          <FadeIn>{index === 0 ? <BannerCampaign {...section} /> : <SideBannerCampaign {...section} />}</FadeIn>
        </section>
      ))}
    </>
  );
}

// The section's background (campaigns.section_bg_color, picked per campaign
// in admin) and the text colour that stays readable on it, as CSS
// variables for the section's own words. The yellow "Shop the sale"
// button turns dark on a pale background, where yellow would vanish. The
// value is checked as #rrggbb by both saveCampaign and a database
// constraint before it gets here.
function sectionColors(campaign: Campaign, fallback: string): CSSProperties {
  const background = campaign.section_bg_color ?? fallback;
  const ink = sectionInk(background);
  const dark = ink === "#ffffff";
  return {
    background,
    "--section-bg": background,
    "--section-ink": ink,
    "--section-button": dark ? "var(--color-accent-secondary)" : "#111111",
    "--section-button-ink": dark ? "#111111" : "#ffffff",
  } as CSSProperties;
}

// Widths that subtract the carousel's 1.25rem gaps, so a row is exactly
// that many whole cards: plain fractions overflowed by the gaps, and the
// last scroll position left the first visible card cut off at the left.
const FIVE_ACROSS =
  "w-[calc((100%-1.25rem)/2)] sm:w-[calc((100%-2.5rem)/3)] md:w-[calc((100%-3.75rem)/4)] lg:w-[calc((100%-5rem)/5)]";
const FOUR_ACROSS =
  "w-[calc((100%-1.25rem)/2)] sm:w-[calc((100%-2.5rem)/3)] md:w-[calc((100%-3.75rem)/4)]";

function CampaignCards({
  campaign,
  products,
  itemClassName,
  perRow,
}: CampaignSectionWithProducts & { itemClassName: string; perRow: number }) {
  // Arrows only once there's more than one row's worth to scroll to.
  return (
    <Carousel ariaLabel={`${campaign.name} products`} itemClassName={itemClassName} showArrows={products.length > perRow}>
      {products.map((product) => (
        <CampaignProductCard
          key={product.id}
          product={product}
          // Every product here already carries its own
          // campaign-featured variant id as defaultVariantId (see
          // applyCampaignFeaturedDisplay) -- the PDP must open on
          // that exact variant, not whatever the product's own
          // globally-cheapest default happens to be.
          linkVariantId={product.defaultVariantId}
        />
      ))}
    </Carousel>
  );
}

// Plan 1: a banner with the products on a panel rising into it.
//
// With the campaign's own section banner pair (sql/106), the banner runs
// full width behind the panel, which covers its bottom part: 60% of the
// 4:1 desktop image, half of the 8:5 phone one, exactly what the admin
// form's diagrams show. The overlap is a percentage of the section's width
// (percentage margins resolve against width), so it tracks the banner's
// height at every size.
//
// Without that pair it falls back to the landing page banner, shown whole
// but capped narrower than the panel so it stays short, with the panel
// rising a fixed 40-56px into its lower edge. A campaign with no banner at
// all gets a plain red header instead, and the panel sits below it.
function BannerCampaign({ campaign, products }: CampaignSectionWithProducts) {
  const sectionDesktop = campaign.section_banner_desktop_url ?? campaign.section_banner_mobile_url;
  const sectionMobile = campaign.section_banner_mobile_url ?? campaign.section_banner_desktop_url;
  const hasSectionBanner = Boolean(sectionDesktop || sectionMobile);
  const desktop = campaign.desktop_banner_url ?? campaign.mobile_banner_url;
  const mobile = campaign.mobile_banner_url ?? campaign.desktop_banner_url;
  const hasBanner = hasSectionBanner || Boolean(desktop || mobile);
  const href = `/campaign/${campaign.slug}`;
  const overlap = hasSectionBanner ? "-mt-[31.25%] md:-mt-[15%]" : hasBanner ? "-mt-10 md:-mt-14" : "";

  return (
    <div className="overflow-hidden rounded-2xl pb-2.5 sm:rounded-[20px] sm:pb-5" style={sectionColors(campaign, DEFAULT_SECTION_BG)}>
      {hasSectionBanner ? (
        <>
          <Link href={href} className="block" aria-label={`${campaign.name}: view the sale`}>
            {sectionMobile && (
              <div className="relative aspect-[8/5] w-full md:hidden">
                <Image src={sectionMobile} alt="" fill loading="lazy" quality={88} sizes="100vw" className="object-cover" />
              </div>
            )}
            {sectionDesktop && (
              <div className="relative hidden aspect-[4/1] w-full md:block">
                <Image
                  src={sectionDesktop}
                  alt=""
                  fill
                  loading="lazy"
                  quality={88}
                  sizes="(min-width: 1180px) 1180px, 100vw"
                  className="object-cover"
                />
              </div>
            )}
          </Link>
          <h2 className="sr-only">{campaign.name}</h2>
        </>
      ) : hasBanner ? (
        <>
          <Link
            href={href}
            className="mx-auto block w-full max-w-[300px] px-2.5 pt-2.5 sm:px-5 sm:pt-5 md:max-w-[880px]"
            aria-label={`${campaign.name}: view the sale`}
          >
            {/* Same art direction and ratios as CampaignBanner: the 4:3
                phone upload below md, the 3.2:1 desktop one from md up,
                each only downloaded where it shows. */}
            {mobile && (
              <div className="relative aspect-[800/600] w-full overflow-hidden rounded-xl md:hidden">
                <Image src={mobile} alt="" fill loading="lazy" quality={88} sizes="300px" className="object-cover" />
              </div>
            )}
            {desktop && (
              <div className="relative hidden aspect-[1600/500] w-full overflow-hidden rounded-xl md:block">
                <Image
                  src={desktop}
                  alt=""
                  fill
                  loading="lazy"
                  quality={88}
                  sizes="840px"
                  className="object-cover"
                />
              </div>
            )}
          </Link>
          <h2 className="sr-only">{campaign.name}</h2>
        </>
      ) : (
        <div className="flex items-center gap-2 px-4 pt-4 pb-3 sm:px-6 sm:pt-6 sm:pb-5">
          <BoltIcon className="h-5 w-5 shrink-0 fill-current text-[var(--color-accent-secondary)] sm:h-7 sm:w-7" />
          <h2 className="min-w-0 flex-1 truncate font-heading text-lg font-extrabold tracking-tight text-[var(--section-ink)] sm:text-[28px] md:text-[32px]">
            {campaign.name}
          </h2>
        </div>
      )}

      <div className={`relative mx-2.5 flex flex-col gap-2.5 sm:mx-5 sm:gap-3.5 ${overlap}`}>
        <div className="campaign-panel rounded-xl p-2 shadow-[0_10px_30px_rgba(0,0,0,0.18)] sm:rounded-[14px] sm:p-3.5">
          <CampaignCards campaign={campaign} products={products} itemClassName={FIVE_ACROSS} perRow={5} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          {campaign.show_countdown && campaign.end_at ? (
            <div className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-bold text-[var(--color-flash-text)] sm:px-3.5 sm:py-1.5 sm:text-sm">
              <BoltIcon className="h-3 w-3 shrink-0 fill-current text-[var(--color-flash)]" />
              <CampaignCountdown target={campaign.end_at} label="Ends in" tone="flash" />
            </div>
          ) : (
            <span />
          )}
          <Link
            href={href}
            className="flex h-11 shrink-0 items-center rounded-full border-[1.5px] border-[color-mix(in_srgb,var(--section-ink)_70%,transparent)] px-4 text-sm font-semibold text-[var(--section-ink)] transition-colors hover:bg-[var(--section-ink)] hover:text-[var(--section-bg)] sm:px-5"
          >
            View All →
          </Link>
        </div>
      </div>
    </div>
  );
}

// Plan 2: banner, name, a boxed countdown and the shop button in a column
// beside the products (above them on a phone), so nothing covers the
// banner. Uses the 4:3 phone banner at every size, since the column is
// narrow; the panel beside it is narrower than Plan 1's, so it shows four
// cards across on large screens instead of five.
function SideBannerCampaign({ campaign, products }: CampaignSectionWithProducts) {
  const banner = campaign.mobile_banner_url ?? campaign.desktop_banner_url;
  const href = `/campaign/${campaign.slug}`;
  const shopButton = (
    <Link
      href={href}
      className="flex h-11 items-center justify-center rounded-xl bg-[var(--section-button)] px-4 text-sm font-bold text-[var(--section-button-ink)] transition-opacity hover:opacity-90"
    >
      Shop the sale →
    </Link>
  );

  return (
    <div
      style={sectionColors(campaign, "#b91c1c")}
      className="flex flex-col gap-3 rounded-2xl p-2.5 sm:rounded-[20px] sm:p-5 lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-5"
    >
      <div className="grid grid-cols-[132px_minmax(0,1fr)] items-center gap-2.5 sm:grid-cols-[200px_minmax(0,1fr)] sm:gap-4 lg:flex lg:flex-col lg:items-stretch lg:gap-4">
        {banner ? (
          <Link href={href} className="relative block aspect-[800/600] w-full overflow-hidden rounded-xl" aria-label={`${campaign.name}: view the sale`}>
            <Image src={banner} alt="" fill loading="lazy" quality={88} sizes="(min-width: 1024px) 240px, (min-width: 640px) 200px, 132px" className="object-cover" />
          </Link>
        ) : (
          <div className="flex aspect-[800/600] w-full items-center justify-center rounded-xl bg-black/15">
            <BoltIcon className="h-10 w-10 fill-current text-[var(--color-accent-secondary)]" />
          </div>
        )}
        <div className="flex min-w-0 flex-col gap-2 lg:gap-4">
          <h2 className="font-heading text-[17px] leading-tight font-extrabold tracking-tight text-[var(--section-ink)] sm:text-2xl lg:text-[26px]">
            {campaign.name}
          </h2>
          {campaign.show_countdown && campaign.end_at && (
            <div className="flex flex-col gap-2">
              <span className="flex items-center gap-1.5 text-xs font-bold tracking-widest text-[var(--section-ink)] opacity-85">
                <BoltIcon className="h-3 w-3 fill-current text-[var(--color-accent-secondary)]" />
                ENDS IN
              </span>
              <CampaignCountdown target={campaign.end_at} label="Ends in" size="boxes" />
            </div>
          )}
        </div>
        <div className="hidden lg:mt-auto lg:block">{shopButton}</div>
      </div>

      <div className="campaign-panel rounded-xl p-2 sm:rounded-[14px] sm:p-3.5">
        <CampaignCards campaign={campaign} products={products} itemClassName={FOUR_ACROSS} perRow={4} />
      </div>

      <div className="lg:hidden">{shopButton}</div>
    </div>
  );
}
