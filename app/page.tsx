import Link from "next/link";
import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { getCategories } from "@/lib/data/categories";
import { getNewArrivals } from "@/lib/data/products";
import { HeroSlider } from "@/components/marketing/HeroSlider";
import { ServiceCards } from "@/components/marketing/ServiceCards";
import { CategoryCard } from "@/components/marketing/CategoryCard";
import { HomeProductCard } from "@/components/marketing/HomeProductCard";
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

export default async function HomePage() {
  const [categories, newArrivals] = await Promise.all([
    getCategories(),
    getNewArrivals(4),
  ]);

  return (
    <div className={`home-fonts ${poppins.variable} flex flex-1 flex-col`}>
      <HeroSlider />

      <ServiceCards />

      {newArrivals.length > 0 && (
        <section className="mx-auto w-full max-w-[var(--container-width)] px-6 py-[var(--section-padding-y)] max-sm:py-12">
          <FadeIn>
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-[32px] font-extrabold tracking-tight">
                New Arrivals
              </h2>
              <Link href="/new-arrivals" className="text-sm underline">
                View all
              </Link>
            </div>
          </FadeIn>
          <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {newArrivals.map((product, index) => (
              <FadeIn key={product.id} delay={index * 0.05}>
                <HomeProductCard product={product} />
              </FadeIn>
            ))}
          </div>
        </section>
      )}

      <section id="categories" className="mx-auto w-full max-w-[var(--container-width)] px-6 py-[var(--section-padding-y)] max-sm:py-12">
        <FadeIn>
          <h2 className="font-heading text-[32px] font-extrabold tracking-tight">
            Explore by Category
          </h2>
        </FadeIn>
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category, index) => (
            <FadeIn key={category.id} delay={index * 0.05}>
              <CategoryCard category={category} />
            </FadeIn>
          ))}
        </div>
      </section>

      <WhyShopWithUs />

      <CustomerReviews />

      <HomeNewsletter />

      <div className="mx-auto w-full max-w-[var(--container-width)] px-6 pb-[var(--section-padding-y)] max-sm:pb-12">
        <RecentlyViewedSection />
      </div>
    </div>
  );
}
