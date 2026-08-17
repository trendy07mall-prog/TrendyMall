import Link from "next/link";
import { CategoryCard } from "@/components/marketing/CategoryCard";
import { FadeIn } from "@/components/motion/FadeIn";
import type { Category } from "@/types";

// Categories are passed in already filtered to "has at least one real
// product" by lib/data/categories.ts's getCategoriesWithProducts() -- this
// component never decides what counts as sellable, it just renders
// whatever the live catalog says. If the catalog is briefly empty (e.g.
// mid-migration), the section renders nothing rather than showing a
// stale/hardcoded list.
export function AboutCategories({ categories }: { categories: Category[] }) {
  if (categories.length === 0) return null;

  return (
    <section className="bg-white px-6 py-[var(--section-padding-y)] max-sm:py-14">
      <div className="mx-auto w-full max-w-[var(--container-width)]">
        <FadeIn>
          <p className="text-center text-sm font-semibold tracking-wide text-[#16A34A] uppercase">
            What We Sell
          </p>
          <h2 className="font-heading mt-2 text-center text-2xl font-bold tracking-tight sm:text-3xl">
            Our current catalog
          </h2>
        </FadeIn>

        <FadeIn delay={0.08}>
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {categories.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
        </FadeIn>

        <FadeIn delay={0.12}>
          <div className="mt-8 text-center">
            <Link
              href="/shop"
              className="transition-brand inline-flex min-h-11 items-center rounded-[var(--radius-btn)] bg-[var(--foreground)] px-8 py-3 text-sm font-semibold text-white hover:bg-[var(--color-btn-hover)]"
            >
              Shop All Products
            </Link>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
