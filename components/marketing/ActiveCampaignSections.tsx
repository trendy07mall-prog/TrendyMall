import Link from "next/link";
import Image from "next/image";
import { ProductCard } from "@/components/product/ProductCard";
import { Carousel } from "@/components/marketing/Carousel";
import { FadeIn } from "@/components/motion/FadeIn";
import { CampaignCountdown } from "@/components/marketing/CampaignCountdown";
import { BoltIcon } from "@/components/ui/Icon";
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
// Two looks, both on a red ground with every card in the flash sale style
// (ProductCard tone="flash"); the products, order and carousel behaviour
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
          className="mx-auto w-full max-w-[1180px] px-3 py-[var(--home-section-padding-y)] sm:px-6"
        >
          <FadeIn>{index === 0 ? <BannerCampaign {...section} /> : <SideBannerCampaign {...section} />}</FadeIn>
        </section>
      ))}
    </>
  );
}

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
        <ProductCard
          key={product.id}
          product={product}
          tone="flash"
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

// Plan 1: the campaign's own banner with the products on a white panel
// that rises into its lower part. The overlap is a percentage of the
// section's width, so it tracks the banner's height at every size: the
// panel covers roughly the bottom 30% of a 4:3 phone banner and the bottom
// 22% of a 3.2:1 desktop one. A
// campaign without a banner image gets a plain red header instead, and the
// panel sits below it rather than over it.
function BannerCampaign({ campaign, products }: CampaignSectionWithProducts) {
  const desktop = campaign.desktop_banner_url ?? campaign.mobile_banner_url;
  const mobile = campaign.mobile_banner_url ?? campaign.desktop_banner_url;
  const hasBanner = Boolean(desktop || mobile);
  const href = `/campaign/${campaign.slug}`;

  return (
    <div className="overflow-hidden rounded-2xl bg-[var(--color-flash)] pb-2.5 sm:rounded-[20px] sm:pb-5">
      {hasBanner ? (
        <>
          <Link href={href} className="block" aria-label={`${campaign.name}: view the sale`}>
            {/* Same art direction and ratios as CampaignBanner: the 4:3
                phone upload below md, the 3.2:1 desktop one from md up,
                each only downloaded where it shows. */}
            {mobile && (
              <div className="relative aspect-[800/600] w-full md:hidden">
                <Image src={mobile} alt="" fill loading="lazy" quality={88} sizes="100vw" className="object-cover" />
              </div>
            )}
            {desktop && (
              <div className="relative hidden aspect-[1600/500] w-full md:block">
                <Image
                  src={desktop}
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
      ) : (
        <div className="flex items-center gap-2 px-4 pt-4 pb-3 sm:px-6 sm:pt-6 sm:pb-5">
          <BoltIcon className="h-5 w-5 shrink-0 fill-current text-[var(--color-accent-secondary)] sm:h-7 sm:w-7" />
          <h2 className="min-w-0 flex-1 truncate font-heading text-lg font-extrabold tracking-tight text-white sm:text-[28px] md:text-[32px]">
            {campaign.name}
          </h2>
        </div>
      )}

      <div className={`relative mx-2.5 flex flex-col gap-2.5 sm:mx-5 sm:gap-3.5 ${hasBanner ? "-mt-[22%] md:-mt-[7%]" : ""}`}>
        <div className="rounded-xl bg-white p-2 shadow-[0_10px_30px_rgba(0,0,0,0.18)] sm:rounded-[14px] sm:p-3.5">
          <CampaignCards campaign={campaign} products={products} itemClassName="w-1/2 sm:w-1/3 md:w-1/4 lg:w-1/5" perRow={5} />
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
            className="flex h-11 shrink-0 items-center rounded-full border-[1.5px] border-white/70 px-4 text-sm font-semibold text-white transition-colors hover:bg-white hover:text-[var(--color-flash-text)] sm:px-5"
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
      className="flex h-11 items-center justify-center rounded-xl bg-[var(--color-accent-secondary)] px-4 text-sm font-bold text-[var(--foreground)] transition-opacity hover:opacity-90"
    >
      Shop the sale →
    </Link>
  );

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-[var(--color-flash-hover)] p-2.5 sm:rounded-[20px] sm:p-5 lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-5">
      <div className="grid grid-cols-[132px_minmax(0,1fr)] items-center gap-2.5 sm:grid-cols-[200px_minmax(0,1fr)] sm:gap-4 lg:flex lg:flex-col lg:items-stretch lg:gap-4">
        {banner ? (
          <Link href={href} className="relative block aspect-[800/600] w-full overflow-hidden rounded-xl" aria-label={`${campaign.name}: view the sale`}>
            <Image src={banner} alt="" fill loading="lazy" quality={88} sizes="(min-width: 1024px) 240px, (min-width: 640px) 200px, 132px" className="object-cover" />
          </Link>
        ) : (
          <div className="flex aspect-[800/600] w-full items-center justify-center rounded-xl bg-[var(--color-flash)]">
            <BoltIcon className="h-10 w-10 fill-current text-[var(--color-accent-secondary)]" />
          </div>
        )}
        <div className="flex min-w-0 flex-col gap-2 lg:gap-4">
          <h2 className="font-heading text-[17px] leading-tight font-extrabold tracking-tight text-white sm:text-2xl lg:text-[26px]">
            {campaign.name}
          </h2>
          {campaign.show_countdown && campaign.end_at && (
            <div className="flex flex-col gap-2">
              <span className="flex items-center gap-1.5 text-xs font-bold tracking-widest text-[#ffe08a]">
                <BoltIcon className="h-3 w-3 fill-current text-[var(--color-accent-secondary)]" />
                ENDS IN
              </span>
              <CampaignCountdown target={campaign.end_at} label="Ends in" size="boxes" />
            </div>
          )}
        </div>
        <div className="hidden lg:mt-auto lg:block">{shopButton}</div>
      </div>

      <div className="rounded-xl bg-white p-2 sm:rounded-[14px] sm:p-3.5">
        <CampaignCards campaign={campaign} products={products} itemClassName="w-1/2 sm:w-1/3 md:w-1/4 lg:w-1/4" perRow={4} />
      </div>

      <div className="lg:hidden">{shopButton}</div>
    </div>
  );
}
