import Link from "next/link";
import { FadeIn } from "@/components/motion/FadeIn";

export function AboutHero() {
  return (
    <section className="bg-gradient-to-br from-[#0F2D52] to-[#173f70] px-6 py-20 text-white sm:py-28">
      <div className="mx-auto flex w-full max-w-[var(--container-width)] flex-col items-center text-center">
        <FadeIn>
          <p className="text-sm font-semibold tracking-wide text-[#4ADE80] uppercase">About TrendyMall</p>
          <h1 className="font-heading mt-3 text-3xl font-extrabold tracking-tight sm:text-5xl">
            Built for better value. Growing toward a better marketplace.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm text-white/80 sm:text-base">
            TrendyMall began in 2021 selling through third-party marketplaces. Today we run our own
            direct-to-customer store, focused on fair pricing, honest service, and steadily growing what
            we offer — with a bigger vision for where we&apos;re headed next.
          </p>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
            <Link
              href="/shop"
              className="transition-brand min-h-11 rounded-[var(--radius-btn)] bg-[#16A34A] px-8 py-3.5 text-sm font-semibold text-white hover:bg-[#15803d]"
            >
              Shop TrendyMall
            </Link>
            <a
              href="#our-story"
              className="transition-brand min-h-11 rounded-[var(--radius-btn)] border border-white/30 px-8 py-3.5 text-sm font-semibold text-white hover:bg-white/10"
            >
              Explore Our Story
            </a>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
