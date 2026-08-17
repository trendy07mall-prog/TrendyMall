import { FadeIn } from "@/components/motion/FadeIn";

export function AboutTrustBand() {
  return (
    <section className="bg-[#0F2D52] px-6 py-16 text-center text-white">
      <FadeIn>
        <div className="mx-auto w-full max-w-2xl">
          <h2 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
            We don&apos;t promise perfection. We promise transparency.
          </h2>
          <p className="mt-4 text-sm text-white/75 sm:text-base">
            We&apos;ll get things wrong sometimes — every store does. What we commit to is being honest
            when we do, fixing it, and being straightforward with you about pricing, delivery, and
            returns along the way.
          </p>
        </div>
      </FadeIn>
    </section>
  );
}
