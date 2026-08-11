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
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-[32px] font-extrabold tracking-tight">
                <span aria-hidden="true">⚡ </span>
                {campaign.name}
              </h2>
              <Link
                href={`/campaign/${campaign.slug}`}
                className="text-sm font-semibold underline-offset-2 hover:underline"
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
                <ProductCard key={product.id} product={product} hideDeliveryEstimate />
              ))}
            </Carousel>
          </div>
        </section>
      ))}
    </>
  );
}
