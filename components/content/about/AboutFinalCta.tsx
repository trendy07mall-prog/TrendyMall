import Link from "next/link";
import { FadeIn } from "@/components/motion/FadeIn";

export function AboutFinalCta() {
  return (
    <section className="bg-white px-6 py-16 text-center">
      <FadeIn>
        <h2 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
          Looking for your next purchase?
        </h2>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/shop"
            className="transition-brand min-h-11 rounded-[var(--radius-btn)] bg-[#16A34A] px-8 py-3.5 text-sm font-semibold text-white hover:bg-[#15803d]"
          >
            Shop Now
          </Link>
          <Link
            href="/contact"
            className="transition-brand min-h-11 rounded-[var(--radius-btn)] border border-[var(--foreground)] px-8 py-3.5 text-sm font-semibold hover:bg-black/5"
          >
            Contact Us
          </Link>
        </div>
      </FadeIn>
    </section>
  );
}
