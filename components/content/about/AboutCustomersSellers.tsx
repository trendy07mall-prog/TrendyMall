import Link from "next/link";
import { ShoppingBagIcon, StoreIcon } from "@/components/ui/Icon";
import { FadeIn } from "@/components/motion/FadeIn";

export function AboutCustomersSellers() {
  return (
    <section className="bg-white px-6 py-[var(--section-padding-y)] max-sm:py-14">
      <div className="mx-auto w-full max-w-[var(--container-width)]">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <FadeIn>
            <div className="flex h-full flex-col rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--color-card)] p-8">
              <ShoppingBagIcon className="h-9 w-9 shrink-0 text-[#0F2D52]" />
              <h3 className="font-heading mt-4 text-xl font-bold">For Customers</h3>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Shop our current catalog today — fair prices, honest descriptions, and support you can
                actually reach.
              </p>
              <Link
                href="/shop"
                className="transition-brand mt-6 inline-flex min-h-11 w-fit items-center rounded-[var(--radius-btn)] bg-[var(--foreground)] px-6 py-3 text-sm font-semibold text-white hover:bg-[var(--color-btn-hover)]"
              >
                Start Shopping
              </Link>
            </div>
          </FadeIn>

          <FadeIn delay={0.08}>
            <div className="flex h-full flex-col rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--color-card)] p-8">
              <StoreIcon className="h-9 w-9 shrink-0 text-[#0F2D52]" />
              <h3 className="font-heading mt-4 text-xl font-bold">For Future Sellers</h3>
              <p className="mt-2 text-sm text-[var(--muted)]">
                We&apos;re working toward a marketplace model where future sellers can reach customers
                through TrendyMall. This isn&apos;t open yet — it&apos;s part of where we&apos;re headed.
              </p>
              <Link
                href="/contact"
                className="transition-brand mt-6 inline-flex min-h-11 w-fit items-center rounded-[var(--radius-btn)] border border-[var(--foreground)] px-6 py-3 text-sm font-semibold hover:bg-black/5"
              >
                Get in Touch
              </Link>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
