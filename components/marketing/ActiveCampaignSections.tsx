import Link from "next/link";
import { ProductCard } from "@/components/product/ProductCard";
import { Carousel } from "@/components/marketing/Carousel";
import { FadeIn } from "@/components/motion/FadeIn";
import type { Campaign, ProductWithPrimaryImage } from "@/types";

export interface CampaignSectionWithProducts {
  campaign: Campaign;
  products: ProductWithPrimaryImage[];
}

// One section per show_on_homepage-active campaign, each carousel holding
// ONLY that campaign's own products -- never merged across campaigns.
// Zero sections renders nothing at all (no empty heading, no placeholder),
// same "additive, nothing to show means nothing rendered" rule
// CampaignBannerCarousel already follows. Reuses ProductCard and Carousel
// unchanged -- the exact components already powering New Arrivals below.
export function ActiveCampaignSections({ sections }: { sections: CampaignSectionWithProducts[] }) {
  if (sections.length === 0) return null;

  return (
    <>
      {sections.map(({ campaign, products }) => (
        <section
          key={campaign.id}
          className="mx-auto w-full max-w-[var(--home-container-width)] px-6 py-[var(--home-section-padding-y)]"
        >
          <FadeIn>
            <div className="flex items-center justify-between gap-3">
              {/* Campaign names are admin-entered, unbounded length -- unlike
                  a fixed heading this can't just be sized once and forgotten.
                  Scales down at mobile widths (where "Big Bang Flash Sale"-
                  length names need the room) and back up to the original
                  32px/extrabold from sm: onward, where there's space to
                  spare. min-w-0 is required for the ellipsis to ever take
                  effect at all -- flex items default to min-width:auto,
                  which lets content overflow the row instead of truncating
                  (same fix already applied to CheckoutForm's flex columns).
                  overflow/truncate is a last-resort safety net, not the
                  primary fix -- realistic names fit at this size without
                  ever hitting it. */}
              <h2 className="min-w-0 flex-1 truncate font-heading text-base font-bold tracking-tight sm:text-[28px] sm:font-extrabold md:text-[32px]">
                <span aria-hidden="true">⚡ </span>
                {campaign.name}
              </h2>
              <Link
                href={`/campaign/${campaign.slug}`}
                className="shrink-0 text-sm font-semibold underline-offset-2 hover:underline"
              >
                View All →
              </Link>
            </div>
          </FadeIn>
          <div className="mt-6">
            <Carousel
              ariaLabel={`${campaign.name} products`}
              itemClassName="w-1/2 sm:w-1/3 lg:w-1/5"
              showArrows={products.length > 5}
            >
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  hideDeliveryEstimate
                  // Every product here already carries its own
                  // campaign-featured variant id as defaultVariantId (see
                  // applyCampaignFeaturedDisplay) -- the PDP must open on
                  // that exact variant, not whatever the product's own
                  // globally-cheapest default happens to be.
                  linkVariantId={product.defaultVariantId}
                />
              ))}
            </Carousel>
          </div>
        </section>
      ))}
    </>
  );
}
