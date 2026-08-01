import Link from "next/link";
import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { getCategories } from "@/lib/data/categories";
import { getNewArrivals } from "@/lib/data/products";
import { HeroSlider } from "@/components/marketing/HeroSlider";
import { ServiceCards } from "@/components/marketing/ServiceCards";
import { CategoryCard } from "@/components/marketing/CategoryCard";
import { HomeProductCard } from "@/components/marketing/HomeProductCard";
import { Carousel } from "@/components/marketing/Carousel";
import { WhyShopWithUs } from "@/components/marketing/WhyShopWithUs";
import { CustomerReviews } from "@/components/marketing/CustomerReviews";
import { HomeNewsletter } from "@/components/marketing/HomeNewsletter";
import { RecentlyViewedSection } from "@/components/product/RecentlyViewedSection";
import { FadeIn } from "@/components/motion/FadeIn";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

// Homepage-only heading font (see .home-fonts in globals.css) — every
// other page keeps Manrope headings via the root layout, untouched.
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["700", "800"],
});

function SectionHeader({ title, viewAllHref }: { title: string; viewAllHref: string }) {
  return (
    <FadeIn>
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-[32px] font-extrabold tracking-tight">{title}</h2>
        <Link href={viewAllHref} className="text-sm font-semibold underline-offset-2 hover:underline">
          View All →
        </Link>
      </div>
    </FadeIn>
  );
}

export default async function HomePage() {
  const [categories, newArrivals] = await Promise.all([
    getCategories(),
    getNewArrivals(10),
  ]);

  return (
    <div className={`home-fonts ${poppins.variable} flex flex-1 flex-col`}>
      <HeroSlider />

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
                <HomeProductCard key={product.id} product={product} />
              ))}
            </Carousel>
          </div>
        </section>
      )}

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

      <WhyShopWithUs />

      <CustomerReviews />

      <HomeNewsletter />

      <div className="mx-auto w-full max-w-[var(--home-container-width)] px-6 pb-[var(--home-section-padding-y)]">
        <RecentlyViewedSection />
      </div>
    </div>
  );
}
