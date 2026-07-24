import Link from "next/link";
import { getCategories } from "@/lib/data/categories";
import { getNewArrivals } from "@/lib/data/products";
import { Hero } from "@/components/marketing/Hero";
import { TrustBadges } from "@/components/marketing/TrustBadges";
import { CategoryCard } from "@/components/marketing/CategoryCard";
import { ProductGrid } from "@/components/product/ProductGrid";
import { RecentlyViewedSection } from "@/components/product/RecentlyViewedSection";
import { FadeIn } from "@/components/motion/FadeIn";

export default async function HomePage() {
  const [categories, newArrivals] = await Promise.all([
    getCategories(),
    getNewArrivals(4),
  ]);

  return (
    <div className="flex flex-1 flex-col">
      <Hero />

      {newArrivals.length > 0 && (
        <section className="mx-auto w-full max-w-6xl px-6 py-16">
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
          <div className="mt-8">
            <ProductGrid products={newArrivals} />
          </div>
        </section>
      )}

      <section id="categories" className="mx-auto w-full max-w-6xl px-6 py-16">
        <FadeIn>
          <h2 className="font-heading text-[32px] font-extrabold tracking-tight">
            Shop by Category
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

      <TrustBadges />

      <div className="mx-auto w-full max-w-6xl px-6 pb-16">
        <RecentlyViewedSection />
      </div>
    </div>
  );
}
